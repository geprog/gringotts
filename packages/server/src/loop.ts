import { database } from '~/database';
import { log } from '~/log';
import { taskFunctions } from '~/tasks';

const pageSize = 10;

let isLooping = false;
export async function loopTasks(): Promise<void> {
  if (isLooping) {
    return;
  }
  isLooping = true;

  try {
    const now = new Date();

    let page = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const tasks = await database.tasks.find(
        { executeAt: { $lte: now }, startedAt: null },
        { limit: pageSize, offset: page * pageSize, populate: ['project'] },
      );

      for await (const task of tasks) {
        // Lock task processing
        task.startedAt = new Date();
        await database.em.persistAndFlush(task);

        const { project } = task;
        if (!project) {
          log.error({ taskId: task._id }, 'Task has no project');
          task.error = 'Task has no project';
          task.endedAt = new Date();
          await database.em.persistAndFlush(task);
          continue;
        }

        try {
          await taskFunctions[task.type](task);
        } catch (error) {
          task.error = (error as Error).message || (error as string).toString();
          log.error({ taskId: task._id, error }, 'An error occurred while processing task');
        }

        task.endedAt = new Date();
        await database.em.persistAndFlush(task);
      }

      if (tasks.length < pageSize) {
        break;
      }

      page += 1;
    }
  } catch (e) {
    log.error(e, 'An error occurred while charging invoices');
  }

  isLooping = false;
}

export function startLoops(): void {
  void loopTasks();
  setInterval(() => void loopTasks(), 1000); // TODO: increase loop time
}
