import * as disperse from '../interfaces';
import {Operation, NamedWorker, taskProviderFromList} from '..';
import wait from '../util/wait';

import { expect } from 'chai';

interface SumAPI {
  sum(...x: number[]): Promise<number>;
}

interface CallAPI {
  call(): Promise<void>;
}

class SumWorker extends NamedWorker<SumAPI, number> {
  protected async runAction(action: disperse.Action<SumAPI, number>): Promise<number> {
    const api: SumAPI = {
      sum: async (...x) => {
        return x.reduce((s, x) => s + x, 0);
      }
    };
    return action(api);
  }
}

describe("Basic Functionality", () => {
  describe("Basic Sum Task", () => {
    // Task that doesn't delay in requesting actions
    it("Immidiate Task", async () => {

      const tasks: disperse.Task<SumAPI, number>[] = [];

      const result = new Promise<number>(resolve => {
        tasks.push(async performAction => {
          resolve(await performAction(api => api.sum(1, 2, 3)));
        });
      });

      const o = new Operation<SumAPI, number>(taskProviderFromList(tasks));
      o.registerWorker(new SumWorker('A'));

      expect(await result).to.equal(6);
      await o.waitUntilFinished();
    });
    // Task that has a delay between action result and resolution
    it("Delayed Processing", async () => {

      const tasks: disperse.Task<SumAPI, number>[] = [];

      const result = new Promise<number>(resolve => {
        tasks.push(async performAction => {
          const a = await performAction(api => api.sum(1, 2, 3));
          await wait(100);
          resolve(a);
        });
      });

      const o = new Operation<SumAPI, number>(taskProviderFromList(tasks));
      o.registerWorker(new SumWorker('A'));

      expect(await result).to.equal(6);
      await o.waitUntilFinished();
    });
    it("Delayed Request", async () => {

      const tasks: disperse.Task<SumAPI, number>[] = [];

      const result = new Promise<number>(resolve => {
        tasks.push(async performAction => {
          await wait(100);
          resolve(await performAction(api => api.sum(1, 2, 3)));
        });
      });

      const o = new Operation<SumAPI, number>(taskProviderFromList(tasks));
      o.registerWorker(new SumWorker('A'));

      expect(await result).to.equal(6);
      await o.waitUntilFinished();
    });
    it("Delayed Request + Processing", async () => {

      const tasks: disperse.Task<SumAPI, number>[] = [];

      const result = new Promise<number>(resolve => {
        tasks.push(async performAction => {
          await wait(100);
          const a = await performAction(api => api.sum(1, 2, 3));
          await wait(100);
          resolve(a);
        });
      });

      const o = new Operation<SumAPI, number>(taskProviderFromList(tasks));
      o.registerWorker(new SumWorker('A'));

      expect(await result).to.equal(6);
      await o.waitUntilFinished();
    });
  });
});

describe("Concurrency Configuration", () => {

  const testMaxTasks = (expected: number, max?: number) => async () => {

    let tasksCount = 0;
    let maxTasks = 0;

    const tasks: disperse.Task<CallAPI, void>[] = [];

    for (let i = 0; i < 20; i++) {
      tasks.push(async performAction => {
        tasksCount++;
        maxTasks = Math.max(tasksCount, maxTasks);
        await wait(1);
        await performAction(api => api.call());
        await wait(1);
        await performAction(api => api.call());
        tasksCount--;
      });
    }

    class CallWorker extends NamedWorker<CallAPI, void> {
      protected async runAction(action: disperse.Action<CallAPI, void>): Promise<void> {
        const api: CallAPI = {
          call: async () => {
            await wait(2);
          }
        };
        return action(api);
      }
    }

    console.log(maxTasks);

    const o = new Operation<CallAPI, void>(taskProviderFromList(tasks), max);
    o.registerWorker(new CallWorker('A'));

    await o.waitUntilFinished();
    expect(maxTasks).to.equal(expected);

  }

  it("Default Max Number Of Tasks", testMaxTasks(3));
  it("Custom Max Number Of Tasks", testMaxTasks(5, 5));
});
