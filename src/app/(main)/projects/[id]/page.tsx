import { type Params } from 'next/dist/shared/lib/router/utils/route-matcher';
import { api } from '~/trpc/server';
import { Subheader } from '../../_components/Subheader/Subheader';
import { CompleteButton } from './_components/complete-button';
import { ProjectContent } from './_components/project-content';

export default async function ProjectPage({ params: { id } }: { params: Params }) {
  const projectId = Number(id);

  const project = await api.project.getOne({ id: projectId });

  return (
    <div className="flex-1 flex-col">
      <Subheader>Субхэдер проекта</Subheader>

      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-bold text-gray-800">{project.name}</h2>

        <CompleteButton id={projectId} isCompleted={project.isCompleted} />
      </div>

      <ProjectContent project={project} />
    </div>
  );
}
