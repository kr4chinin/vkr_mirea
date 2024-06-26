'use client';

import { TaskStatus, type Task } from '@prisma/client';
import { formatDate } from 'date-fns';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { getReadableTaskStatusLabel } from '~/lib/utils';
import { DeleteTaskButtonWithAlert } from './delete-task-button-with-alert';
import { ProjectTaskDialog } from './project-task-dialog';
import { Badge, type BadgeVariant } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { useState } from 'react';
import { CreateProjectTaskDialog } from './create-project-task-dialog';

interface Props {
  projectId: number;
  tasks: Task[];
}

const badgeVariantMap: Record<TaskStatus, BadgeVariant['variant']> = {
  [TaskStatus.CHECKING]: 'default',
  [TaskStatus.DONE]: 'outline',
  [TaskStatus.IN_PROGRESS]: 'default',
  [TaskStatus.PLAN]: 'default',
  [TaskStatus.READY_FOR_WORK]: 'default',
  [TaskStatus.REQUIRES_CORRECTION]: 'destructive',
};

export function ProjectTasksTable(props: Props) {
  const { projectId, tasks } = props;

  const [projectTasks, setProjectTasks] = useState(tasks);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <CreateProjectTaskDialog projectId={projectId} setProjectTasks={setProjectTasks} />

      <ScrollArea className="h-full">
        <Table>
          {!projectTasks.length && <TableCaption>В этом проекте пока нет задач.</TableCaption>}

          <TableHeader>
            <TableRow>
              <TableHead>Название задачи</TableHead>
              <TableHead>Дата начала</TableHead>
              <TableHead>Дата окончания</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {projectTasks.map(t => (
              <TableRow className="group" key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ProjectTaskDialog
                      task={t}
                      key={t.id}
                      projectId={projectId}
                      button={<div className="hover:cursor-pointer hover:underline">{t.name}</div>}
                      setProjectTasks={setProjectTasks}
                    />

                    <DeleteTaskButtonWithAlert id={t.id} setProjectTasks={setProjectTasks} />
                  </div>
                </TableCell>
                <TableCell>{t.startDate ? formatDate(t.startDate, 'dd.MM.yyyy') : null}</TableCell>
                <TableCell>{t.endDate ? formatDate(t.endDate, 'dd.MM.yyyy') : null}</TableCell>
                <TableCell>
                  <Badge variant={badgeVariantMap[t.status]}>
                    {getReadableTaskStatusLabel(t.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
