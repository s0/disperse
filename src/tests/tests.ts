import * as disperse from '../interfaces';
import {Operation, NamedWorker, taskProviderFromList} from '..';
import wait from '../util/wait';

import { expect } from 'chai';

interface SumAPI {
  sum(...x: number[]): Promise<number>;
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
