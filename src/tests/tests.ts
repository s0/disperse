import * as disperse from '../interfaces';
import {Operation, NamedWorker, taskProviderFromList} from '../disperse';
import wait from '../util/wait';

import { expect } from 'chai';

interface SumAPI {
  sum(...x: number[]): Promise<number>;
}

type Action = disperse.Action<SumAPI, number>;

describe("Group 1", () => {
  it("Basic Sum Task", async () => {

    const tasks: disperse.Task<SumAPI, number>[] = [];

    const result = new Promise<number>(resolve => {
      tasks.push(async performAction => {
        // await wait(100); // TODO make this work
        const a = await performAction(api => api.sum(1, 2, 3));
        await wait(100); // TODO make this work
        resolve(a);
      });
    });

    class Worker extends NamedWorker<SumAPI, number> {

      async run(distributeAction: disperse.ActionDistributor<SumAPI, number>) {
        let run = true;
        while (run) {
          run = await distributeAction(this.runAction) !== 'no_more_actions';
        }
      }

      private async runAction(action: Action): Promise<number> {
        const api: SumAPI = {
          sum: async (...x) => {
            return x.reduce((s, x) => s + x, 0);
          }
        };
        return action(api);
      }
    }

    const o = new Operation<SumAPI, number>(taskProviderFromList(tasks));
    o.registerWorker(new Worker('A'));

    expect(await result).to.equal(6);
  });
});
