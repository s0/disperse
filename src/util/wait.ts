function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default wait;

export class WaitSeq {

  private next = 0;
  private resolves: (() => void)[] = [];

  public waitFor(i: number) {
    return new Promise(resolve => {
      this.resolves[i] = resolve;
      this.continueIfPossible();
    });
  }

  private continueIfPossible() {
    if (this.resolves[this.next]) {
      setTimeout(this.resolves[this.next], 0);
      this.next++;
      setTimeout(() => this.continueIfPossible, 0);
    }
  }

}
