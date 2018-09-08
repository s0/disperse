export abstract class Loggable {
  private readonly name: string;

  protected constructor(name: string) {
    this.name = name;
  }

  protected log(...args: any[]) {
    console.log(`:: ${this.name}:`, ...args);
  }
}
