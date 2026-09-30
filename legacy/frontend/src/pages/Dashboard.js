import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserGroupIcon, 
  ClockIcon, 
  CalendarIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    leadsLast30Days: 0,
    bookedAppointmentsLast30Days: 0,
    conversionRate: 0,
    avgResponseTimeSeconds: 0
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  // Mock data - in real app, fetch from API
  useEffect(() => {
    // Fetch dashboard stats
    setStats({
      leadsLast30Days: 42,
      bookedAppointmentsLast30Days: 18,
      conversionRate: 42.9,
      avgResponseTimeSeconds: 8.5
    });

    // Fetch recent leads
    setRecentLeads([
      { id: 1, name: 'John Smith', phone: '(555) 123-4567', service: 'Dental Cleaning', status: 'qualified', createdAt: '2023-06-15T10:30:00Z' },
      { id: 2, name: 'Sarah Johnson', phone: '(555) 987-6543', service: 'Root Canal', status: 'booked', createdAt: '2023-06-15T09:15:00Z' },
      { id: 3, name: 'Mike Davis', phone: '(555) 456-7890', service: 'Teeth Whitening', status: 'contacted', createdAt: '2023-06-15T08:45:00Z' },
      { id: 4, name: 'Emily Wilson', phone: '(555) 234-5678', service: 'Dental Implant', status: 'new', createdAt: '2023-06-15T07:20:00Z' },
      { id: 5, name: 'Robert Brown', phone: '(555) 876-5432', service: 'Orthodontics', status: 'booked', createdAt: '2023-06-14T16:30:00Z' }
    ]);

    // Fetch upcoming appointments
    setUpcomingAppointments([
      { id: 1, name: 'Sarah Johnson', service: 'Root Canal', time: '2023-06-16T10:00:00Z' },
      { id: 2, name: 'Robert Brown', service: 'Orthodontics', time: '2023-06-16T11:30:00Z' },
      { id: 3, name: 'Lisa Garcia', service: 'Dental Cleaning', time: '2023-06-16T14:00:00Z' },
      { id: 4, name: 'David Miller', service: 'Crown Placement', time: '2023-06-17T09:00:00Z' }
    ]);
  }, []);

  const StatCard = ({ title, value, icon: Icon, change, subtitle }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center p-3 rounded-md bg-blue-100 text-blue-600">
              <Icon className="h-6 w-6" />
            </span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-5 w-5 text-green-500" />
                    <span className="sr-only">Increased by</span>
                    {change}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {subtitle && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className="font-medium text-gray-700">{subtitle}</span>
          </div>
        </div>
      )}
    </div>
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${Math.round(seconds)} sec`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {currentUser?.business_name || 'Business Owner'}!</h1>
        <p className="mt-2 text-blue-100">
          Your AI assistant has been working hard. Here's what happened while you were away.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Leads Captured (30 days)"
          value={stats.leadsLast30Days}
          icon={UserGroupIcon}
          change="+12%"
          subtitle="vs last 30 days"
        />
        <StatCard
          title="Appointments Booked"
          value={stats.bookedAppointmentsLast30Days}
          icon={CalendarIcon}
          change="+8%"
          subtitle="vs last 30 days"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={ChartBarIcon}
          change="+3.2%"
          subtitle="vs last 30 days"
        />
        <StatCard
          title="Avg Response Time"
          value={formatTime(stats.avgResponseTimeSeconds)}
          icon={ClockIcon}
          change="-1.2s"
          subtitle="faster than average"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Leads</h3>
            <p className="mt-1 text-sm text-gray-500">Latest leads captured by LeadFlow AI</p>
          </div>
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                      lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{lead.service}</div>
                  <div className="mt-1 text-xs text-gray-400">{lead.phone}</div>
                  <div className="mt-2 text-xs text-gray-400">{formatDate(lead.createdAt)}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Appointments</h3>
            <p className="mt-1 text-sm text-gray-500">Your next scheduled appointments</p>
          </div>
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {upcomingAppointments.map((appointment) => (
                <li key={appointment.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{appointment.name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(appointment.time).toLocaleTimeString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{appointment.service}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
          <p className="mt-1 text-sm text-gray-500">Common tasks you can perform</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          <button className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <CurrencyDollarIcon className="h-10 w-10 text-blue-500 mb-3" />
            <span className="text-sm font-medium text-gray-900">Add Manual Lead</span>
            <span className="text-xs text-gray-500 mt-1">Enter a lead that came through other channels</span>
          </button>
          <button className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <CalendarIcon className="h-10 w-10 text-blue-500 mb-3" />
            <span className="text-sm font-medium text-gray-900">Schedule Appointment</span>
            <span className="text-xs text-gray-500 mt-1">Manually schedule an appointment</span>
          </button>
          <button className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <ChartBarIcon className="h-10 w-10 text-blue-500 mb-3" />
            <span className="text-sm font-medium text-gray-900">View Detailed Analytics</span>
            <span className="text-xs text-gray-500 mt-1">See deeper insights and trends</span>
          </button>
        </div>
      </div>
    </div>
  );
}
