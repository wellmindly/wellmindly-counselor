import React, { useState, useEffect } from 'react';
import { api, apiErrorMessage } from '../api';
import { Video, FileText, Mail, Star, Clock, Search, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Active Modals state
  const [activeSessionNote, setActiveSessionNote] = useState<any | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [savingNote, setSavingNote] = useState(false);

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

  const fetchSessions = () => {
    setLoading(true);
    api
      .get('/counselors/me/sessions')
      .then((res) => {
        if (res.data.success) {
          setSessions(res.data.data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSaveNote = async () => {
    if (!activeSessionNote) return;
    setSavingNote(true);
    setBannerMessage(null);
    setBannerError(null);
    try {
      await api.post(`/counselors/me/sessions/${activeSessionNote.id}/notes`, {
        title: noteTitle,
        content: noteContent,
        isPrivate,
      });
      setActiveSessionNote(null);
      setBannerMessage('Session note saved successfully!');
      fetchSessions();
    } catch (err: any) {
      setBannerError(apiErrorMessage(err, 'Failed to save session note.'));
    } finally {
      setSavingNote(false);
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

  const filteredSessions = sessions.filter((s) => {
    const name = `${s.student?.firstName || ''} ${s.student?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
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
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">
          No sessions found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSessions.map((session) => {
            const start = new Date(session.startTime);
            const isConfirmed = session.status === 'CONFIRMED';
            const isCompleted = session.status === 'COMPLETED';

            return (
              <div key={session.id} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-base">
                        {session.student?.firstName?.[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                          {session.student?.firstName} {session.student?.lastName}
                        </h3>
                        <p className="text-slate-400 text-xs">{session.student?.email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        isConfirmed
                          ? 'bg-indigo-50 text-indigo-700'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center space-x-2 text-slate-600 text-xs">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Scheduled (UTC): <strong>{start.toUTCString()}</strong></span>
                  </div>

                  {session.notes?.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900">
                      <p className="font-bold flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Latest Note ({session.notes.length})</span>
                      </p>
                      <p className="mt-1 line-clamp-2">{session.notes[session.notes.length - 1].content}</p>
                    </div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <a
                    href={session.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center space-x-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Meeting</span>
                  </a>

                  <button
                    onClick={() => {
                      setActiveSessionNote(session);
                      setNoteTitle(`Note for ${session.student?.firstName}`);
                      setNoteContent('');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
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
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
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
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                  >
                    <Star className="w-3.5 h-3.5 text-purple-600" />
                    <span>Feedback</span>
                  </button>
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
              Add Session Note ({activeSessionNote.student?.firstName})
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
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>Private note (visible only to counselors)</span>
            </label>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setActiveSessionNote(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700"
              >
                {savingNote ? 'Saving...' : 'Save Note'}
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
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMail}
                disabled={sendingMail}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700"
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
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback}
                className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-700"
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
