import { clerkClient } from '@clerk/nextjs/server';
import { differenceInDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { z } from 'zod';
import { type ProjectTasksBurndownData } from '~/lib/models/project-tasks-burndown-data';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const analyticsRouter = createTRPCRouter({
  getProjectMonitoringStats: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return {
        count: await ctx.db.task.count({ where: { projectId: input.projectId } }),
        completedCount: await ctx.db.task.count({
          where: { projectId: input.projectId, isCompleted: true },
        }),
        overdueCount: await ctx.db.task.count({
          where: { projectId: input.projectId, endDate: { lt: new Date() } },
        }),
        withoutDateCount: await ctx.db.task.count({
          where: { projectId: input.projectId, startDate: null, endDate: null },
        }),
      };
    }),

  getProjectsAnalytics: publicProcedure.query(async ({ ctx }) => {
    const getProjectsAverageDuration = async () => {
      const projects = await ctx.db.project.findMany({
        where: {
          startDate: { not: null },
          endDate: { not: null },
        },
        select: {
          startDate: true,
          endDate: true,
        },
      });

      const durations = projects.map(({ startDate, endDate }) => {
        if (!startDate || !endDate) {
          return 0;
        }

        const durationInDays = differenceInDays(endDate, startDate);

        return durationInDays;
      });

      const averageDuration =
        durations.reduce((acc, duration) => acc + duration, 0) / durations.length;

      return parseFloat(averageDuration.toFixed(2));
    };

    const getProjectsAverageTasksCount = async () => {
      const projectsWithTasksCount = await ctx.db.project.findMany({
        include: { tasks: true },
      });

      const totalTasksCounts = projectsWithTasksCount.map(project => project.tasks.length);
      const averageTasksCount =
        totalTasksCounts.reduce((acc, count) => acc + count, 0) / totalTasksCounts.length;

      return parseFloat(averageTasksCount.toFixed(2));
    };

    return {
      count: await ctx.db.project.count(),
      averageTasksCount: await getProjectsAverageTasksCount(),
      averageDuration: await getProjectsAverageDuration(),
      completedCount: await ctx.db.project.count({ where: { isCompleted: true } }),
    };
  }),

  getOverdueProjects: publicProcedure.query(({ ctx }) => {
    return ctx.db.project.findMany({
      where: { endDate: { lt: new Date() }, isCompleted: false },
    });
  }),

  getUsersBreakdown: publicProcedure.query(async ({ ctx }) => {
    const users = await clerkClient.users.getUserList({ limit: 1000 });

    const result = [];

    for (const user of users.data) {
      result.push({
        user,
        fullName: user.fullName,
        openTasksCount: await ctx.db.task.count({
          where: { createdBy: user.id, isCompleted: false },
        }),
        completedTasksCount: await ctx.db.task.count({
          where: { createdBy: user.id, isCompleted: true },
        }),
        overdueTasksCount: await ctx.db.task.count({
          where: { createdBy: user.id, endDate: { lt: new Date() }, isCompleted: false },
        }),
        projectsCount: await ctx.db.project.count({ where: { createdBy: user.id } }),
      });
    }

    return result;
  }),

  getProjectTasksBurndown: publicProcedure
    .input(z.object({ projectId: z.number(), fromDate: z.date(), toDate: z.date() }))
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.db.task.findMany({
        where: {
          projectId: input.projectId,
          createdAt: { gte: input.fromDate, lte: input.toDate },
        },
        orderBy: { createdAt: 'asc' },
      });
      const burndownData: ProjectTasksBurndownData[] = [];

      const currentDate = new Date(input.fromDate);

      while (currentDate <= input.toDate) {
        const monthTasks = tasks.filter(task => {
          if (!task.completionDate) return false;

          const taskCompletionDate = task.completionDate;

          return (
            taskCompletionDate.getMonth() === currentDate.getMonth() &&
            taskCompletionDate.getFullYear() === currentDate.getFullYear()
          );
        });

        const tasksCount = monthTasks.length;

        burndownData.push({
          name: format(currentDate, 'MMM yyyy', { locale: ru }),
          total: tasksCount,
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      const hasData = burndownData.some(data => data.total > 0);

      return hasData ? burndownData : [];
    }),
});
