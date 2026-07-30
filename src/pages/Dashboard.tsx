import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Video, Calendar, Users, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/counselors/me/sessions')
      .then((res) => {
        if (res.data.success) {
          setSessions(res.data.data);
        }
      })
      .catch((err) => console.error('Failed to fetch sessions:', err))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcomingSessions = sessions.filter(
    (s) => new Date(s.startTime) > now && s.status === 'CONFIRMED'
  );

  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium uppercase tracking-wider">
            Counselor Dashboard
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-indigo-100 text-sm mt-1 max-w-xl">
            You have <strong className="text-white">{upcomingSessions.length}</strong> upcoming session(s) scheduled. Timezone: <span className="underline">{user?.timezone || 'UTC'}</span>
          </p>
        </div>
        <Link
          to="/availability"
          className="px-5 py-3 bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center space-x-2 shrink-0"
        >
          <Calendar className="w-4 h-4" />
          <span>Manage Weekly Slots</span>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase">Upcoming Sessions</p>
            <h3 className="text-2xl font-bold text-slate-900">{upcomingSessions.length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase">Completed Sessions</p>
            <h3 className="text-2xl font-bold text-slate-900">{completedCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase">Session Duration</p>
            <h3 className="text-xl font-bold text-slate-900">1 Hour Fixed</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase">Status</p>
            <h3 className="text-lg font-bold text-emerald-600 uppercase">{profile?.status || 'ACTIVE'}</h3>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upcoming Appointments</h2>
            <p className="text-slate-500 text-xs mt-0.5">Direct video meeting links and student details</p>
          </div>
          <Link to="/sessions" className="text-indigo-600 text-sm font-semibold hover:underline flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading sessions...</div>
        ) : upcomingSessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>No upcoming sessions scheduled right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingSessions.slice(0, 5).map((session) => {
              const start = new Date(session.startTime);
              return (
                <div key={session.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
                      {session.student?.firstName?.[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {session.student?.firstName} {session.student?.lastName}
                      </h4>
                      <p className="text-slate-500 text-xs flex items-center space-x-2 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{start.toUTCString()}</span>
                      </p>
                    </div>
                  </div>

                  <a
                    href={session.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
                  >
                    <Video className="w-4 h-4" />
                    <span>Launch Video Call</span>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
