import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Users, FileText } from 'lucide-react';

export const StudentTimeline: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<{ student: any; sessions: any[]; notes: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/counselors/me/sessions').then((res) => {
      if (res.data.success) {
        setSessions(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedStudentId(res.data.data[0].student.id);
        }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    api.get(`/counselors/me/students/${selectedStudentId}/timeline`).then((res) => {
      if (res.data.success) {
        setTimeline(res.data.data);
      }
    });
  }, [selectedStudentId]);

  // Unique list of students counseled
  const studentMap = new Map();
  sessions.forEach((s) => {
    if (s.student) {
      studentMap.set(s.student.id, s.student);
    }
  });
  const students = Array.from(studentMap.values());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
          <Users className="w-7 h-7 text-indigo-600" />
          <span>Student Notes & History Timeline</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          View comprehensive student histories, cumulative notes across all past sessions, and clinical progress.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">
          No student histories available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student Selector Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm h-fit">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-500">
              Select Student ({students.length})
            </h3>
            <div className="space-y-2">
              {students.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center space-x-3 ${
                    selectedStudentId === st.id
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold shadow-sm'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                    {st.firstName?.[0]}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-sm truncate">{st.firstName} {st.lastName}</p>
                    <p className="text-slate-400 text-xs truncate">{st.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Student Detailed Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {timeline ? (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {timeline.student?.firstName} {timeline.student?.lastName}
                    </h2>
                    <p className="text-slate-500 text-xs">{timeline.student?.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400 block">Total Sessions</span>
                    <span className="text-2xl font-extrabold text-indigo-600">{timeline.sessions?.length || 0}</span>
                  </div>
                </div>

                {/* Notes Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                  <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>Cumulative Notes History ({timeline.notes?.length || 0})</span>
                  </h3>

                  {timeline.notes?.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4">No notes created for this student yet.</p>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                      {timeline.notes.map((note) => {
                        const date = new Date(note.createdAt);
                        return (
                          <div key={note.id} className="relative pl-8 space-y-1">
                            <div className="absolute left-1 top-1.5 w-5 h-5 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                              <div className="flex justify-between items-center">
                                <h4 className="font-bold text-slate-900 text-sm">{note.title}</h4>
                                <span className="text-xs font-medium text-slate-400">{date.toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-700 text-sm whitespace-pre-wrap">{note.content}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {note.isDraft && (
                                  <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase">
                                    Draft
                                  </span>
                                )}
                                {note.isPrivate && (
                                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold uppercase">
                                    Private Counselor Note
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500">Select a student to view timeline</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
