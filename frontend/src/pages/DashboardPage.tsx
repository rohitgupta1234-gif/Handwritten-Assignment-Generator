import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Upload,
  PenTool,
  Download,
  Clock,
  FolderOpen,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHandwriting } from '../context/HandwritingContext';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Dropdown, DropdownOption } from '../components/ui/Dropdown';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Tabs } from '../components/ui/Tabs';
import { SubjectIcon } from '../components/ui/SubjectIcon';
import { formatRelativeTime, getSubjectColor } from '../utils/helpers';
import { Assignment, DashboardStats, Activity } from '../types';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

export function DashboardPage() {
  const { user } = useAuth();
  const { activeProfile } = useHandwriting();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('recent');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, assignmentsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/assignments?limit=10'),
        ]);
        setStats(statsRes.data);
        setAssignments(assignmentsRes.data.data);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const assignmentActions: DropdownOption[] = [
    { value: 'view', label: 'View Details', icon: <Eye className="w-4 h-4" /> },
    { value: 'edit', label: 'Edit', icon: <Edit className="w-4 h-4" /> },
    { value: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
    { value: 'download', label: 'Download PDF', icon: <Download className="w-4 h-4" /> },
    { value: 'duplicate', label: 'Duplicate', icon: <FolderOpen className="w-4 h-4" /> },
    { value: 'delete', label: 'Delete', icon: <XCircle className="w-4 h-4" /> },
  ];

  const handleAction = (action: string, assignment: Assignment) => {
    switch (action) {
      case 'view':
      case 'preview':
        window.location.href = `/assignment-preview?id=${assignment.id}`;
        break;
      case 'edit':
        window.location.href = `/create-assignment?id=${assignment.id}`;
        break;
      case 'download':
        toast.success('Downloading PDF...');
        break;
      case 'duplicate':
        toast.success('Assignment duplicated');
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this assignment?')) {
          setAssignments(prev => prev.filter(a => a.id !== assignment.id));
          toast.success('Assignment deleted');
        }
        break;
    }
  };

  const filteredAssignments = activeTab === 'recent'
    ? assignments.slice(0, 5)
    : assignments;

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <SkeletonCard variant="dashboard" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-3xl text-notebook-ink-50">
              Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <p className="text-notebook-blue-600 mt-1">
              Here's what's happening with your assignments today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild leftIcon={<Upload className="w-4 h-4" />}>
              <Link to="/create-assignment?tab=upload">Upload Questions</Link>
            </Button>
            <Button asChild leftIcon={<Plus className="w-4 h-4" />}>
              <Link to="/create-assignment">Create Assignment</Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Assignments"
            value={stats?.totalAssignments || 0}
            icon={FileText}
            color="notebook-blue"
            trend="+12% this month"
          />
          <StatCard
            title="Completed"
            value={stats?.completedAssignments || 0}
            icon={CheckCircle}
            color="green"
            trend={`${Math.round(((stats?.completedAssignments || 0) / (stats?.totalAssignments || 1)) * 100)}% completion rate`}
          />
          <StatCard
            title="Total Pages"
            value={stats?.totalPages || 0}
            icon={FolderOpen}
            color="notebook-purple"
            trend="~6.5 pages/assignment"
          />
          <StatCard
            title="Handwriting Profiles"
            value={stats?.handwritingProfiles || 0}
            icon={PenTool}
            color="orange"
            trend={activeProfile ? '1 active profile' : 'No profile yet'}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Assignments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Recent Assignments</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Tabs
                  tabs={[
                    { id: 'recent', label: 'Recent (5)' },
                    { id: 'all', label: 'All Assignments' },
                  ]}
                  activeTab={activeTab}
                  onChange={(tabId) => setActiveTab(tabId as 'recent' | 'all')}
                  variant="pills"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAssignments.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-notebook-blue-200 mx-auto mb-4" />
                  <h3 className="font-heading text-xl text-notebook-ink-50 mb-2">No assignments yet</h3>
                  <p className="text-notebook-blue-500 mb-6">Create your first handwritten assignment to get started.</p>
                  <Button asChild leftIcon={<Plus className="w-4 h-4" />}>
                    <Link to="/create-assignment">Create Assignment</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-notebook-blue-100">
                  {filteredAssignments.map((assignment) => {
                    const subjectColor = getSubjectColor(assignment.subject);

                    return (
                      <div key={assignment.id} className="p-6 hover:bg-notebook-blue-50/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${subjectColor}15` }}>
                            <SubjectIcon subject={assignment.subject} className="w-6 h-6" style={{ color: subjectColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-semibold text-notebook-ink-50 truncate">{assignment.title}</h4>
                                <div className="flex items-center gap-3 mt-1 text-sm text-notebook-blue-500">
                                  <span className="flex items-center gap-1">
                                    <SubjectIcon subject={assignment.subject} className="w-4 h-4" style={{ color: subjectColor }} />
                                    {assignment.subject}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {formatRelativeTime(assignment.updatedAt)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FolderOpen className="w-4 h-4" />
                                    {assignment.totalPages} pages
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusBadge status={assignment.status} size="sm" />
                                <Dropdown
                                  options={assignmentActions}
                                  placeholder="Actions"
                                  onChange={(value) => handleAction(value, assignment)}
                                  disabled={assignment.status === 'generating'}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            {assignments.length > 5 && (
              <CardFooter>
                <Button variant="ghost" fullWidth asChild>
                  <Link to="/my-assignments">View All Assignments →</Link>
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Right Column - Handwriting Profile & Activity */}
        <div className="space-y-6">
          {/* Handwriting Profile Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-notebook-purple-600" />
                Handwriting Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-notebook-purple-50 rounded-xl">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-notebook-purple-500 to-notebook-purple-600 flex items-center justify-center">
                      <PenTool className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-notebook-ink-50">{activeProfile.name}</p>
                      <p className="text-sm text-notebook-purple-600">
                        {activeProfile.characteristics.letterHeight.toFixed(1)}mm letters ·
                        {activeProfile.characteristics.wordSpacing.toFixed(1)}mm spacing ·
                        {activeProfile.characteristics.lineSpacing.toFixed(1)}mm lines
                      </p>
                    </div>
                    <Badge variant="success" dot>Active</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" asChild leftIcon={<Eye className="w-4 h-4" />}>
                      <Link to="/handwriting-profile">View Details</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild leftIcon={<Upload className="w-4 h-4" />}>
                      <Link to="/handwriting-profile?action=update">Update Profile</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-notebook-blue-100 flex items-center justify-center mx-auto mb-4">
                    <PenTool className="w-8 h-8 text-notebook-blue-500" />
                  </div>
                  <h4 className="font-medium text-notebook-ink-50 mb-1">No Handwriting Profile</h4>
                  <p className="text-sm text-notebook-blue-500 mb-4">
                    Upload a sample of your handwriting to generate personalized assignments.
                  </p>
                  <Button asChild leftIcon={<Plus className="w-4 h-4" />}>
                    <Link to="/handwriting-profile">Create Profile</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" fullWidth leftIcon={<Plus className="w-4 h-4" />} asChild>
                  <Link to="/create-assignment">Create New Assignment</Link>
                </Button>
                <Button variant="outline" fullWidth leftIcon={<Upload className="w-4 h-4" />} asChild>
                  <Link to="/create-assignment?tab=upload">Upload Question Paper</Link>
                </Button>
                <Button variant="outline" fullWidth leftIcon={<PenTool className="w-4 h-4" />} asChild>
                  <Link to="/handwriting-profile">Manage Handwriting Profile</Link>
                </Button>
                <Button variant="outline" fullWidth leftIcon={<Download className="w-4 h-4" />} asChild>
                  <Link to="/assignment-preview">Preview & Download</Link>
                </Button>
                <Button variant="outline" fullWidth leftIcon={<FolderOpen className="w-4 h-4" />} asChild>
                  <Link to="/my-assignments">View All Assignments</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: string;
}) {
  const colorMap: Record<string, string> = {
    'notebook-blue': 'bg-notebook-blue-100 text-notebook-blue-600',
    'green': 'bg-green-100 text-green-600',
    'notebook-purple': 'bg-notebook-purple-100 text-notebook-purple-600',
    'orange': 'bg-orange-100 text-orange-600',
  };

  return (
    <Card variant="hover" padding="lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-notebook-blue-500 mb-1">{title}</p>
          <p className="font-heading text-3xl text-notebook-ink-50">{value.toLocaleString()}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap['notebook-blue']}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="mt-4 text-xs text-notebook-blue-500">{trend}</p>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    assignment_created: FileText,
    assignment_completed: CheckCircle,
    profile_updated: PenTool,
    pdf_downloaded: Download,
  };
  const Icon = icons[activity.type] || FileText;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-notebook-blue-50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-notebook-blue-100 text-notebook-blue-600 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-notebook-ink-50">{activity.title}</p>
        <p className="text-sm text-notebook-blue-500 truncate">{activity.description}</p>
        <p className="text-xs text-notebook-blue-400 mt-1">{formatRelativeTime(activity.timestamp)}</p>
      </div>
    </div>
  );
}