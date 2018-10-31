import {Task, TaskProvider, Worker, Action, ActionRunner, ActionDistributor, ActionDistributorResult} from './interfaces';
import {Loggable} from './util/logging';
import wait from './util/wait';

// Re-Export Imports
export {Task, TaskProvider, Worker, Action, ActionRunner, ActionDistributor, ActionDistributorResult, wait};

type WrappedAction<A, R> = {a: Action<A, R>, callback: (r: R) => void};

export class Operation<A, R> extends Loggable {

  /** Changed to null when there are no more tasks */
  private taskProvider: TaskProvider<A, R> | null;

  private readonly runningTasks: Task<A, R>[] = [];
  private readonly failedTasks: Task<A, R>[] = [];
  private readonly queuedActions: WrappedAction<A, R>[] = [];
  private readonly runningActions: WrappedAction<A, R>[] = [];
  // private readonly failedActions: Action<A, R>[] = [];

  private _notifyPromise: Promise<void> | null = null;
  private _notifyResolve: (() => void) | null = null;

  private _finishedResolve: (() => void) = () => {};
  private readonly _finishedPromise = new Promise(resolve => this._finishedResolve = resolve);

  private notifyAll() {
    if (this._notifyResolve) {
      this._notifyResolve();
      this._notifyResolve = null;
      this._notifyPromise = null;
    }
  }

  private waitForNotify() {
    if (this._notifyPromise) return this._notifyPromise;
    this._notifyPromise = new Promise(resolve => this._notifyResolve = resolve);
  }

  constructor(taskProvider: TaskProvider<A, R>) {
    super('Operation');
    this.taskProvider = taskProvider;
    // Bind Methods
    this.distributeAction = this.distributeAction.bind(this);
    this.performAction = this.performAction.bind(this);
  }

  // External Methods

  public registerWorker(worker: Worker<A, R>) {
    this.log('register worker', worker.id());
    // Just start running the worker
    worker.run(this.distributeAction);
  }

  public waitUntilFinished() {
    return this._finishedPromise;
  }

  // Methods that are passed externally (and need to be bound)

  private async distributeAction(runner: ActionRunner<A, R>): Promise<ActionDistributorResult> {
    const action = await this.getNextAction();
    if (action === 'no_actions') return 'no_more_actions';
    return await runner(action.a)
    .then(result => {
      action.callback(result)
      return 'succeeded' as ActionDistributorResult;
    })
    .catch(() => 'failed' as ActionDistributorResult);
  }

  private async performAction(action: Action<A, R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queuedActions.push({
        a: action,
        callback: resolve
      })
      this.notifyAll();
    });
  }

  // Other Internal Methods

  private async getNextAction(): Promise<WrappedAction<A, R> | 'no_actions'> {
    while (this.queuedActions.length === 0 && this.taskProvider) {
      // No current actions, let's add a new task so that it queues actions
      // TODO: make it possible to limit the maximum number of tasks that can be active at once.
      // so that tasks that may not operate synchronously (e.g. if they require file operations)
      // don't completely fill up the queue.
      await this.startNewTask();
    }
    const action = this.queuedActions.shift();
    if (action) {
      this.runningActions.push(action);
      return action;
    }
    // Handle when new tasks won't immidiately request actions
    while (this.runningTasks.length !== 0) {
      await this.waitForNotify();
      const action = this.queuedActions.shift();
      if (action) {
        this.runningActions.push(action);
        return action;
      }
    }
    // no more tasks and no queued actions, we're done
    // TODO: also detect finishing if all tasks are run and workers don't ask for more work
    this._finishedResolve();
    return 'no_actions';
  }

  private async startNewTask() {
    if (!this.taskProvider) return;
    const task = await this.taskProvider();
    if (!task) {
      // No more tasks
      this.taskProvider = null;
      return;
    }
    this.runningTasks.push(task);
    task(this.performAction)
      .then(() => {
        const i = this.runningTasks.indexOf(task);
        if (i >= 0) this.runningTasks.splice(i, 1);
        this.notifyAll();
      })
      .catch(() => {
        this.failedTasks.push(task);
        const i = this.runningTasks.indexOf(task);
        if (i >= 0) this.runningTasks.splice(i, 1);
        this.notifyAll();
      });
  }

}

/**
 * A basic worker with a string identifier, and which will immidiately run
 * actions, continuously, until they run out.
 */
export abstract class NamedWorker<A, R> extends Loggable implements Worker<A, R> {

  private readonly _id: string;

  public constructor(id: string) {
    super(id);
    this._id = id;
  }

  public id() {
    return this._id;
  }

  public async run(distributeAction: ActionDistributor<A, R>) {
    let run = true;
    while (run) {
      run = await distributeAction(this.runAction) !== 'no_more_actions';
    }
  }

  protected abstract runAction(action: Action<A, R>): Promise<R>;

}

// Utility Methods

export function taskProviderFromList<A, R>(tasks: Task<A, R>[]): TaskProvider<A, R> {
  return async () => {
    const t = tasks.shift();
    if (t) return t;
  }
}
