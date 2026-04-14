import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEpisodes } from '../lib/api';
import { useChannelProfile } from '../hooks/useChannelProfile';
import AppLayout from '../components/ui/AppLayout';

const ACCENT = '#e03535';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar() {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { channelProfile } = useChannelProfile();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    getEpisodes().then(setEpisodes).catch(console.error).finally(() => setLoading(false));
  }, []);

  const weeklyGoal = channelProfile?.weekly_goal || 1;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  // Map episode created dates to day numbers for this month
  const episodesByDay = {};
  episodes.forEach(ep => {
    const d = new Date(ep.created_at);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!episodesByDay[day]) episodesByDay[day] = [];
      episodesByDay[day].push(ep);
    }
  });

  // Weekly stats for this month
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    const weekCells = cells.slice(i, i + 7);
    const count = weekCells.filter(Boolean).reduce((acc, d) => acc + (episodesByDay[d]?.length || 0), 0);
    weeks.push({ days: weekCells, count });
  }

  // Monthly summary
  const monthEpisodes = episodes.filter(ep => {
    const d = new Date(ep.created_at);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });
  const weeksInMonth = Math.ceil(daysInMonth / 7);
  const targetForMonth = weeklyGoal * weeksInMonth;

  return (
    <AppLayout>
      <div style={{ padding: '32px 40px', width: '100%' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Calendar</div>
        <div style={{ fontSize: '13px', color: '#555', marginBottom: '28px' }}>Episode production schedule and output tracking.</div>

        {/* Month summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{monthEpisodes.length}</div>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Episodes This Month</div>
            <div style={{ fontSize: '11px', color: monthEpisodes.length >= targetForMonth ? '#4ade80' : '#444' }}>
              {monthEpisodes.length >= targetForMonth ? `Target hit (${targetForMonth})` : `${targetForMonth - monthEpisodes.length} to reach target`}
            </div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{weeklyGoal}</div>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Weekly Goal</div>
            <Link to="/settings" style={{ fontSize: '11px', color: '#444', textDecoration: 'none' }}>Change in Settings →</Link>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{targetForMonth}</div>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Monthly Target</div>
            <div style={{ fontSize: '11px', color: '#444' }}>{weeklyGoal} × {weeksInMonth} weeks</div>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #222' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', padding: '4px 8px', fontFamily: 'inherit' }}>‹</button>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', padding: '4px 8px', fontFamily: 'inherit' }}>›</button>
          </div>

          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #222' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #1e1e1e' : 'none' }}>
              {week.days.map((day, di) => {
                const isToday = day && today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
                const dayEps = day ? (episodesByDay[day] || []) : [];
                return (
                  <div
                    key={di}
                    style={{
                      minHeight: '72px',
                      padding: '8px',
                      borderRight: di < 6 ? '1px solid #1e1e1e' : 'none',
                      background: isToday ? '#1e1a1a' : 'transparent',
                    }}
                  >
                    {day && (
                      <>
                        <div style={{
                          fontSize: '11px',
                          color: isToday ? ACCENT : '#444',
                          fontWeight: isToday ? '700' : '400',
                          marginBottom: '4px',
                          width: '20px', height: '20px',
                          borderRadius: '50%',
                          background: isToday ? 'rgba(224,53,53,0.1)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{day}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {dayEps.slice(0, 2).map(ep => (
                            <div key={ep.id} title={ep.title || 'Untitled'} style={{
                              fontSize: '9px', color: '#fff', background: ep.status === 'complete' ? '#0a2a1a' : '#222',
                              border: `1px solid ${ep.status === 'complete' ? '#14532d' : '#333'}`,
                              borderRadius: '3px', padding: '1px 4px',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {ep.title || 'Untitled'}
                            </div>
                          ))}
                          {dayEps.length > 2 && (
                            <div style={{ fontSize: '9px', color: '#444' }}>+{dayEps.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Weekly breakdown */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Weekly Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {weeks.map((week, wi) => {
              const startDay = week.days.find(Boolean);
              const endDay = [...week.days].reverse().find(Boolean);
              const hit = week.count >= weeklyGoal;
              return (
                <div key={wi} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#555', width: '100px', flexShrink: 0 }}>
                    {startDay && endDay ? `${MONTH_NAMES[viewMonth].slice(0, 3)} ${startDay}–${endDay}` : ''}
                  </div>
                  <div style={{ flex: 1, height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (week.count / weeklyGoal) * 100)}%`, background: hit ? '#4ade80' : ACCENT, borderRadius: '2px', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: hit ? '#4ade80' : '#555', fontWeight: '600', width: '60px', textAlign: 'right', flexShrink: 0 }}>
                    {week.count}/{weeklyGoal} ep
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
