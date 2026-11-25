import {
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  Cpu,
  BookOpen,
  Landmark,
  Globe,
  TrendingUp,
  Folder,
} from 'lucide-react';

interface SubjectIconProps {
  subject: string;
  className?: string;
  style?: React.CSSProperties;
}

const subjectIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  mathematics: Calculator,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  'computer-science': Cpu,
  english: BookOpen,
  history: Landmark,
  geography: Globe,
  economics: TrendingUp,
  other: Folder,
};

/**
 * Shared SubjectIcon component to display subject-specific icons
 * Eliminates duplication across DashboardPage, MyAssignmentsPage, AssignmentPreviewPage, etc.
 */
export function SubjectIcon({ subject, className, style }: SubjectIconProps) {
  const Icon = subjectIcons[subject] || Folder;
  return <Icon className={className} style={style} />;
}