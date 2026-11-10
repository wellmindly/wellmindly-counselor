import React, { useState, useEffect } from 'react';
import { api, apiErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatSessionTime, resolveTimeZone } from '../utils/time';
import {
  Video,
  FileText,
  Mail,
  Star,
  Clock,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Ban,
  UserX,
  PencilLine,
} from 'lucide-react';

// Same window the dashboard and the student portal use: the room opens 10
// minutes before the start and stays open until 30 minutes after the end.
const JOIN_OPENS_MS = 10 * 60 * 1000;
const JOIN_CLOSES_MS = 30 * 60 * 1000;
const LIVE_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
// Statuses for which a session took place (or was due to) and a counselor
// evaluation makes sense. Cancelled/expired bookings never happened.
const EVALUABLE_STATUSES = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  NO_SHOW: 'bg-orange-50 text-orange-800',
};

/* Status changes a counselor may make, mirroring PATCH /me/sessions/:id/status:
     CONFIRMED | IN_PROGRESS -> COMPLETED  (after the start time)
     CONFIRMED               -> NO_SHOW    (after the start time)
     PENDING | CONFIRMED     -> CANCELLED_BY_COUNSELOR (before the end time)
   Offering only these keeps the buttons from promising something the API will
   refuse with a 409. */
type CounselorStatusChange = 'COMPLETED' | 'NO_SHOW' | 'CANCELLED_BY_COUNSELOR';

const allowedStatusChanges = (
  s: { status: string; startTime: string; endTime?: string | null },
  nowMs: number
): CounselorStatusChange[] => {
  const started = nowMs >= new Date(s.startTime).getTime();
  const ended = nowMs >= endOf(s);
  const out: CounselorStatusChange[] = [];
  if (started && ['CONFIRMED', 'IN_PROGRESS'].includes(s.status)) out.push('COMPLETED');
  if (started && s.status === 'CONFIRMED') out.push('NO_SHOW');
  if (!ended && ['PENDING', 'CONFIRMED'].includes(s.status)) out.push('CANCELLED_BY_COUNSELOR');
  return out;
};

const STATUS_CHANGE_COPY: Record<
  CounselorStatusChange,
  { button: string; title: string; confirm: string; done: string; body: (name: string, when: string) => string }
> = {
  COMPLETED: {
    button: 'Mark Completed',
    title: 'Mark this session as completed?',
    confirm: 'Mark Completed',
    done: 'Session marked as completed.',
    body: (name, when) => `This records that your session with ${name} on ${when} took place. It can't be undone.`,
  },
  NO_SHOW: {
    button: 'Mark No-show',
    title: 'Mark this session as a no-show?',
    confirm: 'Mark No-show',
    done: 'Session marked as a no-show.',
    body: (name, when) => `This records that ${name} did not attend the session on ${when}. It can't be undone.`,
  },
  CANCELLED_BY_COUNSELOR: {
    button: 'Cancel Session',
    title: 'Cancel this session?',
    confirm: 'Cancel Session',
    done: 'Session cancelled. The student can see the cancellation in their app.',
    body: (name, when) =>
      `${name} will be emailed that the session on ${when} is cancelled, and the slot opens up again. This can't be undone.`,
  },
};

const endOf = (s: { startTime: string; endTime?: string | null }) =>
  s.endTime ? new Date(s.endTime).getTime() : new Date(s.startTime).getTime() + 60 * 60 * 1000;

export const Sessions: React.FC = () => {
  const { user } = useAuth();
  const timeZone = resolveTimeZone(user?.timezone);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Active Modals state
  const [activeSessionNote, setActiveSessionNote] = useState<any | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  // The draft being continued, if the modal was opened from a draft rather than "Add Note".
  const [editingNote, setEditingNote] = useState<any | null>(null);

  const [statusAction, setStatusAction] = useState<{ session: any; status: CounselorStatusChange } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [activeMailStudent, setActiveMailStudent] = useState<any | null>(null);
  const [mailSubject, setMailSubject] = useState('');
  const [mailMessage, setMailMessage] = useState('');
  const [sendingMail, setSendingMail] = useState(false);

  const [activeFeedbackSession, setActiveFeedbackSession] = useState<any | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackSummary, setFeedbackSummary] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Success and Error banner state
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // `silent` refreshes after an action without blanking the list behind a spinner.
  const fetchSessions = (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    api
      .get('/counselors/me/sessions')
      .then((res) => {
        if (res.data.success) {
          setSessions(res.data.data);
        }
      })
      .catch((err) => {
        // There was no catch here: a failed load was an unhandled rejection and the
        // page claimed "No sessions found", indistinguishable from an empty diary.
        if (!silent) setLoadError(apiErrorMessage(err, 'Could not load your sessions. Please try again.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const openNewNote = (session: any) => {
    setActiveSessionNote(session);
    setEditingNote(null);
    setNoteTitle(`Note for ${session.student?.firstName}`);
    setNoteContent('');
    setIsPrivate(true);
    setNoteError(null);
  };

  const openDraft = (session: any, note: any) => {
    setActiveSessionNote(session);
    setEditingNote(note);
    setNoteTitle(note.title || '');
    setNoteContent(note.content || '');
    setIsPrivate(note.isPrivate ?? true);
    setNoteError(null);
  };

  const closeNoteModal = () => {
    setActiveSessionNote(null);
    setEditingNote(null);
  };

  /* Drafts can be saved and reopened as often as needed. Finalising (a new note
     saved as final, or a draft sent with isDraft:false) makes it part of the
     clinical record, which the API then refuses to edit (409 NOTE_FINALISED). */
  const handleSaveNote = async (asDraft: boolean) => {
    if (!activeSessionNote) return;
    // The API stores whatever it is given, so an accidental tap on Save used to
    // file an empty clinical note that then showed up as "Latest Note".
    if (!noteContent.trim()) {
      setNoteError('Write the note before saving it.');
      return;
    }
    setNoteError(null);
    setSavingNote(true);
    setBannerMessage(null);
    setBannerError(null);
    const body = { title: noteTitle, content: noteContent, isPrivate, isDraft: asDraft };
    try {
      if (editingNote) {
        await api.put(`/counselors/me/sessions/${activeSessionNote.id}/notes/${editingNote.id}`, body);
      } else {
        await api.post(`/counselors/me/sessions/${activeSessionNote.id}/notes`, body);
      }
      closeNoteModal();
      setBannerMessage(asDraft ? 'Draft saved. You can finish it later from the session card.' : 'Session note finalised.');
      fetchSessions(true);
    } catch (err: any) {
      // Keep the modal open so the text isn't lost; show why it failed there.
      setNoteError(apiErrorMessage(err, 'Failed to save session note.'));
      // e.g. 409 NOTE_FINALISED: someone finalised it in another tab.
      if (err?.response?.status === 409) fetchSessions(true);
    } finally {
      setSavingNote(false);
    }
  };

  const openStatusAction = (session: any, status: CounselorStatusChange) => {
    setStatusAction({ session, status });
    setStatusReason('');
    setStatusError(null);
  };

  const handleStatusChange = async () => {
    if (!statusAction) return;
    const { session, status } = statusAction;
    setUpdatingStatus(true);
    setStatusError(null);
    setBannerMessage(null);
    setBannerError(null);
    try {
      const res = await api.patch(`/counselors/me/sessions/${session.id}/status`, {
        status,
        ...(status === 'CANCELLED_BY_COUNSELOR' && statusReason.trim() ? { reason: statusReason.trim() } : {}),
      });
      const updated = res.data?.data;
      // Patch the card at once (the response has no student/notes includes),
      // then refresh quietly so everything else stays in step.
      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? { ...s, status: updated?.status || status, cancellationReason: updated?.cancellationReason ?? s.cancellationReason }
            : s
        )
      );
      setStatusAction(null);
      setBannerMessage(STATUS_CHANGE_COPY[status].done);
      fetchSessions(true);
    } catch (err: any) {
      setStatusError(apiErrorMessage(err, 'Could not update the session. Please try again.'));
      // 409 means our copy is stale (student cancelled, time passed, another tab).
      if (err?.response?.status === 409 || err?.response?.status === 404) fetchSessions(true);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendMail = async () => {
    if (!activeMailStudent) return;
    setSendingMail(true);
    setBannerMessage(null);
    setBannerError(null);
    try {
      await api.post(`/counselors/me/students/${activeMailStudent.student.id}/send-email`, {
        subject: mailSubject,
        message: mailMessage,
      });
      setBannerMessage(`Direct email queued for ${activeMailStudent.student.firstName}!`);
      setActiveMailStudent(null);
    } catch (err: any) {
      setBannerError(apiErrorMessage(err, 'Failed to send direct email.'));
    } finally {
      setSendingMail(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!activeFeedbackSession) return;
    setSubmittingFeedback(true);
    setBannerMessage(null);
    setBannerError(null);
    try {
      await api.post(`/counselors/me/sessions/${activeFeedbackSession.id}/feedback`, {
        rating: feedbackRating,
        summaryNote: feedbackSummary,
      });
      setActiveFeedbackSession(null);
      setBannerMessage('Post-session evaluation submitted!');
      fetchSessions();
    } catch (err: any) {
      setBannerError(apiErrorMessage(err, 'Failed to submit post-session evaluation.'));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const nowMs = Date.now();
  const isUpcoming = (s: any) => LIVE_STATUSES.includes(s.status) && endOf(s) + JOIN_CLOSES_MS > nowMs;

  const filteredSessions = sessions
    .filter((s) => {
      const name = `${s.student?.firstName || ''} ${s.student?.lastName || ''}`.toLowerCase();
      return name.includes(search.toLowerCase());
    })
    /* The API returns newest first, which buried tomorrow's session under next
       month's. Upcoming sessions come first, soonest at the top; the history
       follows, most recent first. */
    .sort((a, b) => {
      const ua = isUpcoming(a);
      const ub = isUpcoming(b);
      if (ua !== ub) return ua ? -1 : 1;
      const diff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      return ua ? diff : -diff;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Counseling Sessions Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Manage scheduled calls, notes, direct student emails, and post-session evaluations</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {bannerMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bannerError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button onClick={() => setBannerError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading sessions...</div>
      ) : loadError ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-rose-200 text-sm space-y-3" role="alert">
          <p className="text-rose-700">{loadError}</p>
          <button
            onClick={() => fetchSessions()}
            className="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">
          No sessions found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSessions.map((session) => {
            const startMs = new Date(session.startTime).getTime();
            // A room is only worth opening for a session that is still going to
            // happen. The button used to render for every card, so a counselor
            // could "join" a session that completed last week, or was a no-show,
            // or was cancelled. `meetingLink` is non-nullable in the schema, but
            // it is still checked so a missing one degrades to a disabled label
            // rather than an anchor that reloads the page.
            // The clock gate matches the dashboard: without it this page offered a
            // live-looking link to a session days away that only opened an empty room.
            const isLive = LIVE_STATUSES.includes(session.status);
            const joinWindowOpen =
              nowMs >= startMs - JOIN_OPENS_MS && nowMs <= endOf(session) + JOIN_CLOSES_MS;
            const canJoin = Boolean(session.meetingLink) && isLive && joinWindowOpen;
            const joinNotYet = Boolean(session.meetingLink) && isLive && nowMs < startMs - JOIN_OPENS_MS;
            // Evaluations are post-session and the API accepts one per session (a
            // second gets 409). The button used to be live on future and cancelled
            // sessions, and after feedback was already in.
            const feedbackSubmitted = Boolean(session.counselorFeedback);
            const canGiveFeedback =
              !feedbackSubmitted && EVALUABLE_STATUSES.includes(session.status) && nowMs >= startMs;
            const feedbackLabel = feedbackSubmitted
              ? 'Feedback Sent'
              : nowMs < startMs && EVALUABLE_STATUSES.includes(session.status)
              ? 'Feedback After Call'
              : 'Feedback';
            const notesByDate = [...(session.notes || [])]
              .filter((n: any) => !n.deletedAt)
              .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const finalNotes = notesByDate.filter((n: any) => !n.isDraft);
            const draftNotes = notesByDate.filter((n: any) => n.isDraft);
            const latestNote = finalNotes[finalNotes.length - 1];
            const statusChanges = allowedStatusChanges(session, nowMs);

            return (
              <div key={session.id} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-base">
                        {session.student?.firstName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-lg truncate">
                          {session.student?.firstName} {session.student?.lastName}
                        </h3>
                        <p className="text-slate-500 text-xs truncate">{session.student?.email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-2xl text-[10px] sm:text-xs leading-tight text-center font-semibold uppercase tracking-wider max-w-[7.5rem] lg:max-w-none shrink-0 ${
                        STATUS_BADGE[session.status] || 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {String(session.status).replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center space-x-2 text-slate-600 text-xs">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Scheduled: <strong>{formatSessionTime(session.startTime, timeZone)}</strong></span>
                  </div>

                  {latestNote && (
                    <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900">
                      <p className="font-bold flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Latest Note ({finalNotes.length})</span>
                      </p>
                      <p className="mt-1 line-clamp-2 break-words">{latestNote.content}</p>
                    </div>
                  )}

                  {draftNotes.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-700 space-y-2">
                      <p className="font-bold flex items-center space-x-1">
                        <PencilLine className="w-3.5 h-3.5 text-slate-500" />
                        <span>Draft Notes ({draftNotes.length})</span>
                      </p>
                      {draftNotes.map((note: any) => (
                        <div key={note.id} className="flex items-center justify-between gap-2">
                          <span className="truncate min-w-0">{note.title || 'Untitled draft'}</span>
                          <button
                            onClick={() => openDraft(session, note)}
                            className="min-h-11 px-3 shrink-0 text-indigo-700 font-semibold hover:underline"
                          >
                            Continue
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                  {canJoin ? (
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-11 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center space-x-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Meeting</span>
                    </a>
                  ) : (
                    <span
                      className="min-h-11 px-3 py-2 bg-slate-50 text-slate-500 font-semibold text-xs rounded-xl border border-slate-200 flex items-center justify-center space-x-1.5 text-center"
                      title={joinNotYet ? 'The link opens 10 minutes before the session' : 'This session is not joinable'}
                    >
                      <Video className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {!session.meetingLink
                          ? 'No Meeting Link'
                          : joinNotYet
                          ? 'Opens 10 min before'
                          : isLive
                          ? 'Call Ended'
                          : 'Not Joinable'}
                      </span>
                    </span>
                  )}

                  <button
                    onClick={() => openNewNote(session)}
                    className="min-h-11 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Add Note</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMailStudent(session);
                      setMailSubject(`Follow-up regarding your session`);
                      setMailMessage('');
                    }}
                    className="min-h-11 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Student</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveFeedbackSession(session);
                      setFeedbackRating(5);
                      setFeedbackSummary('');
                    }}
                    disabled={!canGiveFeedback}
                    title={
                      feedbackSubmitted
                        ? 'You have already submitted feedback for this session'
                        : !canGiveFeedback
                        ? 'Feedback opens once the session has started'
                        : undefined
                    }
                    className="min-h-11 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {feedbackSubmitted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Star className={`w-3.5 h-3.5 ${canGiveFeedback ? 'text-purple-600' : 'text-slate-400'}`} />
                    )}
                    <span>{feedbackLabel}</span>
                  </button>

                  {statusChanges.includes('COMPLETED') && (
                    <button
                      onClick={() => openStatusAction(session, 'COMPLETED')}
                      className="min-h-11 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{STATUS_CHANGE_COPY.COMPLETED.button}</span>
                    </button>
                  )}
                  {statusChanges.includes('NO_SHOW') && (
                    <button
                      onClick={() => openStatusAction(session, 'NO_SHOW')}
                      className="min-h-11 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-800 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{STATUS_CHANGE_COPY.NO_SHOW.button}</span>
                    </button>
                  )}
                  {statusChanges.includes('CANCELLED_BY_COUNSELOR') && (
                    <button
                      onClick={() => openStatusAction(session, 'CANCELLED_BY_COUNSELOR')}
                      className="min-h-11 px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{STATUS_CHANGE_COPY.CANCELLED_BY_COUNSELOR.button}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Note Modal */}
      {activeSessionNote && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingNote ? 'Continue Draft Note' : 'Add Session Note'} ({activeSessionNote.student?.firstName})
            </h3>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note Title"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write clinical observations, key topics discussed, recommendations..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {noteError && (
              <p className="text-xs font-medium text-rose-700" role="alert">{noteError}</p>
            )}
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>Private note (visible only to counselors)</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Drafts can be edited later. A finalised note becomes part of the session record and can no longer be changed.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={closeNoteModal}
                className="min-h-11 px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveNote(true)}
                disabled={savingNote}
                className="min-h-11 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {savingNote ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={() => handleSaveNote(false)}
                disabled={savingNote}
                className="min-h-11 px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingNote ? 'Saving...' : editingNote ? 'Finalise Note' : 'Save Final Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status change confirmation */}
      {statusAction && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-change-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 id="status-change-title" className="text-lg font-bold text-slate-900">
              {STATUS_CHANGE_COPY[statusAction.status].title}
            </h3>
            <p className="text-sm text-slate-600">
              {STATUS_CHANGE_COPY[statusAction.status].body(
                `${statusAction.session.student?.firstName || 'The student'} ${statusAction.session.student?.lastName || ''}`.trim(),
                formatSessionTime(statusAction.session.startTime, timeZone)
              )}
            </p>
            {statusAction.status === 'CANCELLED_BY_COUNSELOR' && (
              <div>
                <label htmlFor="cancel-reason" className="block text-xs font-semibold text-slate-600 mb-1">
                  Reason for the student (optional)
                </label>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  maxLength={500}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. I'm unwell today - please book another slot."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            {statusError && (
              <p className="text-xs font-medium text-rose-700" role="alert">{statusError}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => setStatusAction(null)}
                disabled={updatingStatus}
                className="min-h-11 px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                {statusAction.status === 'CANCELLED_BY_COUNSELOR' ? 'Keep Session' : 'Go Back'}
              </button>
              <button
                onClick={handleStatusChange}
                disabled={updatingStatus}
                className={`min-h-11 px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 ${
                  statusAction.status === 'CANCELLED_BY_COUNSELOR'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : statusAction.status === 'NO_SHOW'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {updatingStatus ? 'Updating...' : STATUS_CHANGE_COPY[statusAction.status].confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Email Modal */}
      {activeMailStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              Email Student: {activeMailStudent.student?.firstName} {activeMailStudent.student?.lastName}
            </h3>
            <input
              type="text"
              value={mailSubject}
              onChange={(e) => setMailSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              rows={4}
              value={mailMessage}
              onChange={(e) => setMailMessage(e.target.value)}
              placeholder="Compose email message to student..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setActiveMailStudent(null)}
                className="min-h-11 px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMail}
                disabled={sendingMail}
                className="min-h-11 px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {sendingMail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {activeFeedbackSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              Post-Session Counselor Feedback
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Student Engagement Rating (1-5 Stars)</label>
              <select
                value={feedbackRating}
                onChange={(e) => setFeedbackRating(parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5/5 - Excellent)</option>
                <option value={4}>⭐⭐⭐⭐ (4/5 - Good)</option>
                <option value={3}>⭐⭐⭐ (3/5 - Moderate)</option>
                <option value={2}>⭐⭐ (2/5 - Low Engagement)</option>
                <option value={1}>⭐ (1/5 - Risk / Needs Immediate Follow-up)</option>
              </select>
            </div>
            <textarea
              rows={4}
              value={feedbackSummary}
              onChange={(e) => setFeedbackSummary(e.target.value)}
              placeholder="Provide session summary feedback and evaluation..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setActiveFeedbackSession(null)}
                className="min-h-11 px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback}
                className="min-h-11 px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-700 disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
