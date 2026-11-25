import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FolderOpen,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { Dropdown } from '../components/ui/Dropdown';
import { Modal } from '../components/ui/Modal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { SubjectIcon } from '../components/ui/SubjectIcon';
import { formatRelativeTime, formatDate, getSubjectColor } from '../utils/helpers';
import { Assignment } from '../types';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'draft', label: 'Draft' },
  { value: 'generating', label: 'Generating' },
  { value: 'preview', label: 'Preview' },
  { value: 'failed', label: 'Failed' },
];

const subjectOptions = [
  { value: '', label: 'All Subjects' },
  ...[{ id: 'mathematics', name: 'Mathematics' }, { id: 'physics', name: 'Physics' }, { id: 'chemistry', name: 'Chemistry' }, { id: 'biology', name: 'Biology' }, { id: 'computer-science', name: 'Computer Science' }, { id: 'english', name: 'English' }, { id: 'history', name: 'History' }, { id: 'geography', name: 'Geography' }, { id: 'economics', name: 'Economics' }, { id: 'other', name: 'Other' }].map(s => ({ value: s.id, label: s.name })),
];

const sortOptions = [
  { value: 'updatedAt-desc', label: 'Recently Updated' },
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'totalPages-desc', label: 'Most Pages' },
];

export function MyAssignmentsPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Refetch function that can be called from anywhere
  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/assignments');
      setAssignments(response.data.data);
    } catch (error) {
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Refetch when window gains focus (e.g., after returning from create/edit page)
  useEffect(() => {
    const handleFocus = () => {
      fetchAssignments();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAssignments]);

  const filteredAssignments = assignments
    .filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || a.status === statusFilter;
      const matchesSubject = !subjectFilter || a.subject === subjectFilter;
      return matchesSearch && matchesStatus && matchesSubject;
    })
    .sort((a, b) => {
      const [field, order] = sortBy.split('-');
      const aVal = a[field as keyof Assignment];
      const bVal = b[field as keyof Assignment];
      // Handle undefined values
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);

  const handleSelectAll = () => {
    if (selectedAssignments.length === paginatedAssignments.length) {
      setSelectedAssignments([]);
    } else {
      setSelectedAssignments(paginatedAssignments.map(a => a.id));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedAssignments(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAction = (action: string, assignment: Assignment) => {
    switch (action) {
      case 'view':
      case 'preview':
        navigate(`/assignment-preview?id=${assignment.id}`);
        break;
      case 'edit':
        navigate(`/create-assignment?id=${assignment.id}`);
        break;
      case 'download-pdf':
        toast.success('Downloading PDF...');
        break;
      case 'download-docx':
        toast.success('Downloading DOCX...');
        break;
      case 'duplicate':
        toast.success('Assignment duplicated');
        break;
      case 'delete':
        setShowDeleteModal(true);
        break;
    }
  };

  const handleBulkDelete = () => {
    setAssignments(prev => prev.filter(a => !selectedAssignments.includes(a.id)));
    setSelectedAssignments([]);
    toast.success(`${selectedAssignments.length} assignments deleted`);
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl text-notebook-ink-50">My Assignments</h1>
            <p className="text-notebook-blue-600 mt-1">Manage all your handwritten assignments</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard variant="assignment" key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-notebook-ink-50">My Assignments</h1>
          <p className="text-notebook-blue-600 mt-1">Manage all your handwritten assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAssignments} leftIcon={<RefreshCw className="w-4 h-4" />} disabled={isLoading} aria-label="Refresh assignments">
            Refresh
          </Button>
          <Button asChild leftIcon={<FileText className="w-4 h-4" />}>
            <Link to="/create-assignment">Create Assignment</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="lg" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-notebook-blue-400" />
            <input
              type="search"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-notebook-paper-100 border border-notebook-blue-200 rounded-xl text-sm focus:outline-none focus:border-notebook-blue-500 focus:ring-2 focus:ring-notebook-blue-500/20"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={statusOptions}
            placeholder="Status"
            className="w-full sm:w-40"
          />
          <Select
            value={subjectFilter}
            onChange={e => { setSubjectFilter(e.target.value); setCurrentPage(1); }}
            options={subjectOptions}
            placeholder="Subject"
            className="w-full sm:w-40"
          />
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            options={sortOptions}
            placeholder="Sort"
            className="w-full sm:w-48"
          />
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedAssignments.length > 0 && (
        <div className="mb-4 p-4 bg-notebook-blue-50 rounded-xl flex items-center justify-between">
          <span className="text-notebook-blue-700 font-medium">
            {selectedAssignments.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkDelete} leftIcon={<Trash2 className="w-4 h-4" />}>
              Delete Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedAssignments([])}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Assignments Grid/List */}
      {filteredAssignments.length === 0 ? (
        <Card variant="notebook" padding="xl" className="text-center">
          <FileText className="w-16 h-16 text-notebook-blue-200 mx-auto mb-4" />
          <h3 className="font-heading text-xl text-notebook-ink-50 mb-2">No assignments found</h3>
          <p className="text-notebook-blue-500 mb-6">
            {searchQuery || statusFilter || subjectFilter
              ? 'Try adjusting your filters'
              : 'Create your first handwritten assignment to get started.'}
          </p>
          {(!searchQuery && !statusFilter && !subjectFilter) && (
            <Button asChild leftIcon={<Plus className="w-4 h-4" />}>
              <Link to="/create-assignment">Create Assignment</Link>
            </Button>
          )}
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedAssignments.map(assignment => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onAction={handleAction}
                  selected={selectedAssignments.includes(assignment.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-notebook-blue-100">
                    <th className="w-12 text-left"><input type="checkbox" checked={selectedAssignments.length === paginatedAssignments.length && paginatedAssignments.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600" /></th>
                    <th className="text-left py-3 px-4 font-medium text-notebook-blue-600">Assignment</th>
                    <th className="text-left py-3 px-4 font-medium text-notebook-blue-600 hidden md:table-cell">Subject</th>
                    <th className="text-left py-3 px-4 font-medium text-notebook-blue-600 hidden lg:table-cell">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-notebook-blue-600 hidden lg:table-cell">Pages</th>
                    <th className="text-left py-3 px-4 font-medium text-notebook-blue-600 hidden lg:table-cell">Updated</th>
                    <th className="w-40 text-right py-3 px-4 font-medium text-notebook-blue-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssignments.map(assignment => (
                    <AssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                      onAction={handleAction}
                      selected={selectedAssignments.includes(assignment.id)}
                      onSelect={handleSelect}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} leftIcon={<ChevronLeft className="w-4 h-4" />} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-10 h-10"
                >
                  {page}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} rightIcon={<ChevronRight className="w-4 h-4" />} />
            </div>
          )}
        </>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Assignment"
        size="sm"
      >
        <p>Are you sure you want to delete this assignment? This action cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { handleBulkDelete(); setShowDeleteModal(false); }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

function AssignmentCard({
  assignment,
  onAction,
  selected,
  onSelect,
}: {
  assignment: Assignment;
  onAction: (action: string, assignment: Assignment) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const subjectColor = getSubjectColor(assignment.subject);

  return (
    <div
      className={`card-hover relative ${selected ? 'ring-2 ring-notebook-blue-500' : ''}`}
      onClick={(e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('button')) onSelect(assignment.id); }}
    >
      {selected && (
        <div className="absolute top-2 right-2 z-10">
          <input type="checkbox" checked={selected} onChange={() => onSelect(assignment.id)} className="w-5 h-5 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500" />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${subjectColor}15` }}>
            <SubjectIcon subject={assignment.subject} className="w-6 h-6" style={{ color: subjectColor }} />
          </div>
          <StatusBadge status={assignment.status} size="sm" />
        </div>
        <h3 className="font-semibold text-notebook-ink-50 mb-2 line-clamp-2">{assignment.title}</h3>
        <div className="flex items-center gap-3 text-sm text-notebook-blue-500 mb-4">
          <span className="flex items-center gap-1">
            <SubjectIcon subject={assignment.subject} className="w-4 h-4" style={{ color: subjectColor }} />
            {assignment.subject}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatRelativeTime(assignment.updatedAt)}
          </span>
          <span className="flex items-center gap-1">
            <FolderOpen className="w-4 h-4" />
            {assignment.totalPages} pages
          </span>
        </div>
        <div className="flex gap-2 pt-4 border-t border-notebook-blue-100">
          <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); onAction('preview', assignment); }} leftIcon={<Eye className="w-4 h-4" />}>
            Preview
          </Button>
          <Dropdown
            options={[
              { value: 'edit', label: 'Edit', icon: <Edit className="w-4 h-4" /> },
              { value: 'download-pdf', label: 'Download PDF', icon: <Download className="w-4 h-4" /> },
              { value: 'download-docx', label: 'Download DOCX', icon: <FileText className="w-4 h-4" /> },
              { value: 'duplicate', label: 'Duplicate', icon: <FolderOpen className="w-4 h-4" /> },
              { value: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4 text-red-500" /> },
            ]}
            placeholder="More"
            onChange={value => onAction(value, assignment)}
          />
        </div>
      </div>
    </div>
  );
}

function AssignmentRow({
  assignment,
  onAction,
  selected,
  onSelect,
}: {
  assignment: Assignment;
  onAction: (action: string, assignment: Assignment) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const subjectColor = getSubjectColor(assignment.subject);

  return (
    <tr className={`border-b border-notebook-blue-100 hover:bg-notebook-blue-50/50 ${selected ? 'bg-notebook-blue-50' : ''}`}>
      <td className="py-4 px-4">
        <input type="checkbox" checked={selected} onChange={() => onSelect(assignment.id)} className="w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500" />
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${subjectColor}15` }}>
            <SubjectIcon subject={assignment.subject} className="w-5 h-5" style={{ color: subjectColor }} />
          </div>
          <div>
            <p className="font-medium text-notebook-ink-50">{assignment.title}</p>
            <p className="text-sm text-notebook-blue-500">{assignment.subject} • {formatRelativeTime(assignment.updatedAt)}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 hidden md:table-cell">
        <span className={`px-2 py-1 text-xs rounded-full font-medium`} style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}>
          {assignment.subject}
        </span>
      </td>
      <td className="py-4 px-4 hidden lg:table-cell">
        <StatusBadge status={assignment.status} size="sm" />
      </td>
      <td className="py-4 px-4 hidden lg:table-cell text-notebook-blue-500">{assignment.totalPages}</td>
      <td className="py-4 px-4 hidden lg:table-cell text-notebook-blue-500">{formatDate(assignment.updatedAt)}</td>
      <td className="py-4 px-4 text-right">
        <Dropdown
          options={[
            { value: 'view', label: 'View', icon: <Eye className="w-4 h-4" /> },
            { value: 'edit', label: 'Edit', icon: <Edit className="w-4 h-4" /> },
            { value: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
            { value: 'download-pdf', label: 'Download PDF', icon: <Download className="w-4 h-4" /> },
            { value: 'download-docx', label: 'Download DOCX', icon: <FileText className="w-4 h-4" /> },
            { value: 'duplicate', label: 'Duplicate', icon: <FolderOpen className="w-4 h-4" /> },
            { value: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4 text-red-500" /> },
          ]}
          placeholder="Actions"
          onChange={value => onAction(value, assignment)}
        />
      </td>
    </tr>
  );
}