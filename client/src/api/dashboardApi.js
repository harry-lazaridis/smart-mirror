export function getDashboardStats() {
  return [
    {
      id: 'calendar',
      title: 'Google Calendar',
      value: 'Not Connected',
      subtitle: 'Connect to display events',
      status: 'error',
    },
    {
      id: 'transport',
      title: 'SL Transport',
      value: 'Active',
      subtitle: 'Showing departures',
      status: 'success',
    },
    {
      id: 'modules',
      title: 'Active Modules',
      value: '5',
      subtitle: 'Modules currently enabled',
      status: 'neutral',
    },
  ]
}

export function getRecentActivity() {
  return [
    {
      id: 1,
      title: 'SL Transport configured',
      subtitle: 'Start: T-Centralen, End: Slussen',
      time: '2 hours ago',
      tag: 'Updated',
      type: 'transport',
    },
    {
      id: 2,
      title: 'Weather module enabled',
      subtitle: 'Showing Stockholm forecast',
      time: 'Yesterday',
      tag: 'Enabled',
      type: 'module',
    },
    {
      id: 3,
      title: 'Account created',
      subtitle: 'Welcome to SmartMirror!',
      time: '3 days ago',
      tag: 'New',
      type: 'account',
    },
  ]
}