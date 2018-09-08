/** A function that when called will provide a next task when available */
export type TaskProvider<A, R> = () => Promise<Task<A, R> | undefined>;

export type ActionDistributorResult = 'succeeded' | 'failed' | 'no_more_actions';

/** A function that when called will provide the givven runner with the next available action, and will resolve when the runner resolves, returning teh status of the task */
export type ActionDistributor<A, R> = (runner: ActionRunner<A, R>) => Promise<ActionDistributorResult>;

/** An operation that needs to be performdd by a worker */
export type Action<ActionInterface, ActionResult> = (a: ActionInterface) => Promise<ActionResult>;

/** A function that when called will run an action */
export type ActionRunner<A, R> = (action: Action<A, R>) => Promise<R>;

/** A unit of work that needs to be done as part of the operation, requiring */
export type Task<A, R> = (performAction: ActionRunner<A, R>) => Promise<void>;

export interface Worker<A, R> {
  id(): string;
  run(distributeAction: ActionDistributor<A, R>): Promise<void>;
}