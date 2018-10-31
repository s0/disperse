# Disperse

[![Total alerts](https://img.shields.io/lgtm/alerts/g/samlanning/disperse.js.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/samlanning/disperse.js/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/samlanning/disperse.js.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/samlanning/disperse.js/context:javascript)

A small typescript library for distributing the core work of many tasks across a
number of "workers".

**Example use cases:**

* Running a long-running API data-mining operation at maximum quota, using a
  collection of many different access tokens, where each token has it's own
  individual quota that gets refreshed independantly.
* Distributing compute tasks to a pool of remote worker machines, and receiving
  and processing the results centrally.

**Terminology:**

* **Operation:** a high level description of what you're trying to acheive with
  the library. A collection of `tasks` to be done, and `workers` that will
  execute the work required of the tasks.

* **Task:** an individual unit of work that needs to be performed. A task
  consists of logical code, and individual `actions` that are what's distributed
  to workers. For example, a task may be to crawl a particular website, and
  individual actions may be separate HTTP requests to that need to be performed.

* **Action:** something that a `worker` needs to perform on behalf of a `task`.
  e.g:

  * Perform an expensive arithmetic operation.
  * Make an HTTP request and return the result.
  * Run a bunch of commands on a remote machine.
  * Process a file.


* **Worker:** something that is able to perform `actions` on behalf of a `task`,
  conceptually this could be many things, e.g:

  * something that calls an API authenticated with a specific token
  * something that connects to a remote machine and runs a command

**Aims:**

* make use of modern language features to make library use easy.
* failed actions should be automatically retried on different workers.
* sensibly handle workers that fail repeatedly.
