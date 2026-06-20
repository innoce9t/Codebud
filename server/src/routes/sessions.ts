import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Session } from '../models/Session.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { File } from '../models/File.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound, forbidden } from '../utils/http.js';
import { resolveProviderConfig } from '../services/ai/resolve.js';
import { runAi } from '../services/ai/index.js';
import { sanitizeUntrusted } from '../services/ai/prompt.js';
import { applyEdits } from '../services/fileService.js';
import { emitToProject } from '../realtime/socket.js';
import type { ChatMode } from '../services/ai/types.js';
import type { ProjectType } from '../models/Project.js';

const router = Router();
router.use(requireAuth);

// ── Session CRUD ─────────────────────────────────────────────

// List the caller's sessions, newest first. Scoped to a project when ?projectId is given.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const filter: Record<string, unknown> = { user: req.userId };
    if (projectId) {
      if (!mongoose.isValidObjectId(projectId)) throw badRequest('Invalid projectId');
      filter.project = projectId;
    }
    const sessions = await Session.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
    res.json({ sessions });
  }),
);

// Find-or-create the caller's single general (no-project) session.
router.get(
  '/general',
  asyncHandler(async (req, res) => {
    let session = await Session.findOne({ user: req.userId, project: null }).sort({ updatedAt: -1 });
    if (!session) {
      session = await Session.create({ user: req.userId, title: 'General chat', project: null });
    }
    res.json({ session });
  }),
);

const createSchema = z.object({
  title: z.string().max(120).optional(),
  projectId: z.string().optional(),
});

// Create a new session.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, projectId } = createSchema.parse(req.body);
    let project: mongoose.Types.ObjectId | null = null;
    if (projectId) {
      if (!mongoose.isValidObjectId(projectId)) throw badRequest('Invalid projectId');
      const p = await Project.findById(projectId);
      if (!p) throw notFound('Project not found');
      const uid = req.userId!;
      const isOwner = String(p.owner) === uid;
      const isCollab = (p.collaborators ?? []).some((c) => String(c.user) === uid);
      if (!isOwner && !isCollab) throw forbidden('Not your project');
      project = p._id as mongoose.Types.ObjectId;
    }
    const session = await Session.create({
      user: req.userId,
      title: title ?? (projectId ? 'Project chat' : 'New conversation'),
      project,
    });
    res.status(201).json({ session });
  }),
);

// Delete a session and its messages.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const session = await Session.findOne({ _id: req.params.id, user: req.userId });
    if (!session) throw notFound('Session not found');
    await ChatMessage.deleteMany({ session: session._id });
    await session.deleteOne();
    res.json({ ok: true });
  }),
);

const titleSchema = z.object({ title: z.string().min(1).max(120) });

// Rename a session.
router.patch(
  '/:id/title',
  asyncHandler(async (req, res) => {
    const { title } = titleSchema.parse(req.body);
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { title },
      { new: true },
    );
    if (!session) throw notFound('Session not found');
    res.json({ session });
  }),
);

// Clear all messages in a session (reset the conversation).
router.delete(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const session = await Session.findOne({ _id: req.params.id, user: req.userId });
    if (!session) throw notFound('Session not found');
    await ChatMessage.deleteMany({ session: session._id });
    const title = session.project ? 'Project chat' : 'General chat';
    await Session.updateOne({ _id: session._id }, { title });
    res.json({ ok: true });
  }),
);

// ── Messages ─────────────────────────────────────────────────

// Get all messages for a session.
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const session = await Session.findOne({ _id: req.params.id, user: req.userId });
    if (!session) throw notFound('Session not found');
    const messages = await ChatMessage.find({ session: session._id }).sort({ createdAt: 1 });
    res.json({ messages, session });
  }),
);

const sendSchema = z.object({
  message: z.string().min(1).max(8000),
  mode: z.enum(['ask', 'plan', 'agent']).default('ask'),
  approvalMode: z.enum(['auto', 'review']).default('auto'),
});

const GENERAL_SYSTEM = `You are CodeBud's in-app agent. CodeBud is a collaborative coding workspace.
You can actively take actions on the user's behalf — navigate pages, change the theme/accent, and
create or open projects — as well as guide them around the app. Be warm, concise, and practical.

App pages (reference as markdown links so the user can click through):
- [Dashboard](/) — project overview and quick-start templates
- [New Project](/new) — create a project (pick JavaScript, Python, or Website workspace)
- [Workspaces](/workspaces) — view all projects grouped by workspace
- [AI Models](/ai-models) — connect providers (Anthropic, OpenAI, Google) and set the active model
- [Theme](/theme) — change color theme and accent
- [Settings](/settings) — account, editor preferences, keybindings, billing
- [Profile](/profile) — name and account info

Navigation & actions:
- To ACTIVELY navigate the user to a page, use:
  [[navigate:/new]]
- To ACTIVELY perform an action, use:
  [[action:changeTheme:dark]]
  [[action:changeAccent:violet]]
  [[action:openProject:<projectId>]]
Both are hidden from the user. ALSO describe in prose what you've done, e.g. "I've switched you
to dark theme." Use at most ONE navigate and ONE action directive per reply.

Available actions:
- changeTheme:light|dark|system — switch the app theme
- changeAccent:indigo|violet|blue|sky|emerald|amber|rose|graphite — change the accent color
- createProject:type:name:description — create a new project where:
  - type is: javascript|python|website
  - name is: the project name (no colons)
  - description is: optional project description (no colons)
  Example: [[action:createProject:javascript:TodoApp:A simple todo application]]
- openProject:<projectId> — open one of the user's existing projects by its id (see CURRENT APP STATE)
- renameProject:<projectId>:<newName> — rename an existing project
  Example: [[action:renameProject:507f1f77bcf86cd799439011:My New Name]]
- deleteProject:<projectId> — delete a project. The app shows the user a confirmation modal first,
  so you do NOT need to ask "are you sure" yourself — just emit the action. Because the user still
  has to confirm, phrase your reply as an offer (e.g. "I've opened a confirmation to delete it"),
  not as a completed deletion.
- shareProject:<projectId> — enable "anyone with the link" sharing and copy the link to the user's
  clipboard. The app shows a confirmation modal first, so phrase your reply as an offer (e.g. "I've
  opened a confirmation to enable link sharing; once you confirm, the link is copied to your
  clipboard"), not as already done.
- setEditor:<setting>:<value> — change an editor preference, where setting is one of:
  - wordWrap|minimap|aiCompletions with value true or false
  - fontSize|tabSize with a number value
  Example: [[action:setEditor:wordWrap:true]] or [[action:setEditor:fontSize:16]]

Be agentic and state-aware. ALWAYS read CURRENT APP STATE below before acting:
- If the user asks to change a setting (theme, accent, editor option) to a value that is ALREADY
  active, do NOT emit the action. Just tell them it's already set that way (e.g. "You're already
  in dark mode.").
- The user's existing projects are listed below. NEVER claim they have no projects, that their
  workspace is empty, or that they need to create one when projects already exist. When they ask
  to "open/rename/delete/share my project" or refer to one by name, match it to the list and use
  the matching action with its id.
- If a project name is ambiguous or you can't find a match, ask the user to clarify which project
  rather than guessing.
- Only suggest creating a project when they have none, or when they explicitly ask to create one.

Helping create a project:
- To create one: emit [[action:createProject:...]] (it creates and opens the project immediately),
  or send them to [New Project](/new) to pick a workspace type and name manually.
- To get AI help editing code, the user must connect a provider on [AI Models](/ai-models),
  set an Active Model, then open a project. Inside a project the chat can read and edit files.
- To browse existing projects, navigate to [Workspaces](/workspaces).

When the user asks about their code or files, explain that you have full file context once a
project is open, and offer to open one of their existing projects or create a new one.`;

// Builds a live snapshot of app state (theme, accent, existing projects) so the general
// agent reasons about what's actually true instead of guessing.
async function buildGeneralState(userId: string): Promise<string> {
  const [user, projects] = await Promise.all([
    User.findById(userId).lean(),
    Project.find({
      $or: [{ owner: userId }, { 'collaborators.user': userId }],
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean(),
  ]);

  const mode = user?.preferences?.theme?.mode ?? 'system';
  const accent = user?.preferences?.theme?.accent ?? 'indigo';
  const activeModel = user?.activeModel || '(none connected)';
  const editor = user?.preferences?.editor;

  const projectLines = projects.length
    ? projects
        // Project names can come from collaborator-shared projects — sanitize so a
        // directive-shaped name can't be echoed into a live action by the model.
        .map((p) => `  - "${sanitizeUntrusted(p.name)}" (${p.type}) — id: ${p._id}`)
        .join('\n')
    : '  (none yet)';

  const editorLine = editor
    ? `fontSize ${editor.fontSize}, tabSize ${editor.tabSize}, wordWrap ${editor.wordWrap}, minimap ${editor.minimap}, aiCompletions ${editor.aiCompletions}`
    : '(defaults)';

  return `CURRENT APP STATE (live — trust this over any assumptions):
- Theme mode: ${mode}
- Accent color: ${accent}
- Active AI model: ${activeModel}
- Editor settings: ${editorLine}
- Existing projects (${projects.length}):
${projectLines}`;
}

// Send a message in a session.
router.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const session = await Session.findOne({ _id: req.params.id, user: req.userId });
    if (!session) throw notFound('Session not found');
    const { message, mode, approvalMode } = sendSchema.parse(req.body);

    // Load project context if session is linked to a project.
    let projectFiles: { path: string; content: string }[] = [];
    let projectName = '';
    let projectType: ProjectType | null = null;
    if (session.project) {
      const [proj, files] = await Promise.all([
        Project.findById(session.project),
        File.find({ project: session.project, isFolder: { $ne: true } }).sort({ path: 1 }),
      ]);
      if (proj) {
        projectName = proj.name;
        projectType = proj.type as ProjectType;
        projectFiles = files.map((f) => ({ path: f.path, content: f.content ?? '' }));
      }
    }

    const history = await ChatMessage.find({ session: session._id }).sort({ createdAt: 1 }).limit(20);

    // Persist user message.
    const userMsg = await ChatMessage.create({ session: session._id, role: 'user', content: message });

    // Auto-title session from first message.
    if (history.length === 0 && session.title === 'New conversation') {
      const autoTitle = message.trim().slice(0, 60) + (message.length > 60 ? '…' : '');
      await Session.updateOne({ _id: session._id }, { title: autoTitle });
    }
    await Session.updateOne({ _id: session._id }, { updatedAt: new Date() });

    const config = await resolveProviderConfig(req.userId!);
    const historyMsgs = history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content }));

    // For general (no-project) sessions, build the agent prompt with a live state snapshot.
    let generalSystem: string | undefined;
    if (!projectType) {
      const stateBlock = await buildGeneralState(req.userId!);
      generalSystem =
        `${GENERAL_SYSTEM}\n\n${stateBlock}` +
        (mode !== 'ask' ? `\n\n${getModeInstruction(mode as ChatMode)}` : '');
    }

    let aiResult: { reply: string; edits: { path: string; action: 'create' | 'update' | 'delete'; content?: string }[] } | null = null;
    try {
      aiResult = await runAi(
        {
          projectType: (projectType ?? 'javascript') as ProjectType,
          projectName: projectName || 'General',
          files: projectFiles,
          history: historyMsgs,
          message,
          mode: mode as ChatMode,
          // For general (no-project) sessions override the system prompt.
          systemOverride: generalSystem,
        },
        config,
      );
    } catch (err) {
      const assistantMessage = await ChatMessage.create({
        session: session._id,
        role: 'assistant',
        content: `The AI model could not be reached: ${(err as Error).message}\n\nCheck your API key under [AI Models](/ai-models).`,
      });
      res.json({ userMessage: userMsg, assistantMessage, edits: [], session });
      return;
    }

    // Only Agent mode may change files. Ask/Plan are read-only — any stray edits are ignored.
    const editsAllowed = mode === 'agent';
    const useReview = mode === 'agent' && approvalMode === 'review';
    let applied: { path: string; action: string }[] = [];
    let pendingEdits: { path: string; action: string; content?: string }[] = [];

    if (editsAllowed && session.project && aiResult!.edits.length) {
      if (useReview) {
        // Store edits for user approval; do not touch disk yet.
        pendingEdits = aiResult!.edits;
      } else {
        applied = await applyEdits(session.project, aiResult!.edits);
        if (applied.length) emitToProject(String(session.project), 'files:bulk-changed', { applied }, req);
      }
    }

    const assistantMsg = await ChatMessage.create({
      session: session._id,
      role: 'assistant',
      content: aiResult!.reply,
      edits: applied,
      pendingEdits,
    });

    res.json({ userMessage: userMsg, assistantMessage: assistantMsg, edits: applied, pendingEdits, session });
  }),
);

// ── Approve pending edits ────────────────────────────────────
router.post(
  '/:id/messages/:msgId/apply',
  asyncHandler(async (req, res) => {
    const session = await Session.findOne({ _id: req.params.id, user: req.userId });
    if (!session) throw notFound('Session not found');

    const msg = await ChatMessage.findOne({ _id: req.params.msgId, session: session._id });
    if (!msg) throw notFound('Message not found');
    if (!msg.pendingEdits?.length) return res.json({ ok: true, applied: [] });

    if (!session.project) throw badRequest('Session has no linked project');

    const pending = (msg.pendingEdits ?? []) as { path: string; action: 'create' | 'update' | 'delete'; content?: string }[];
    const applied = await applyEdits(session.project, pending);
    if (applied.length) emitToProject(String(session.project), 'files:bulk-changed', { applied }, req);

    const updatedMsg = await ChatMessage.findByIdAndUpdate(
      msg._id,
      {
        $push: { edits: { $each: applied } },
        $set: { pendingEdits: [], editsApproved: true },
      },
      { new: true },
    );

    res.json({ ok: true, applied, message: updatedMsg });
  }),
);

// ── Reject pending edits ─────────────────────────────────────
router.delete(
  '/:id/messages/:msgId/pending',
  asyncHandler(async (req, res) => {
    const session = await Session.findOne({ _id: req.params.id, user: req.userId });
    if (!session) throw notFound('Session not found');

    const msg = await ChatMessage.findOneAndUpdate(
      { _id: req.params.msgId, session: session._id },
      { pendingEdits: [], editsApproved: false },
      { new: true },
    );
    if (!msg) throw notFound('Message not found');

    res.json({ ok: true, message: msg });
  }),
);

function getModeInstruction(mode: ChatMode): string {
  if (mode === 'plan')
    return 'PLAN MODE: Before making any suggestions, start with a "## Plan" section listing every step.';
  if (mode === 'agent')
    return 'AGENT MODE: Be comprehensive and autonomous. Complete the full task without asking for confirmation.';
  return '';
}

export default router;
