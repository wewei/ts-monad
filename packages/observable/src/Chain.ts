type Node<T> = {
  prev: Node<T>;
  next: Node<T>;
  value?: T;
};

export const chain = <T>() => {
  const head = {} as Node<T>;
  head.prev = head.next = head;

  function add(value: T): () => boolean {
    const node = { prev: head.prev, next: head, value };
    head.prev = head.prev.next = node;
    return () => {
      if (node.prev !== node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
        node.prev = node.next = node;
        return true;
      }
      return false;
    };
  }

  function forEach(callback: (value: T) => void): void {
    let iter = head.next;
    while (iter !== head) {
      callback(iter.value as T);
      iter = iter.next;
    }
  }

  function isEmpty(): boolean {
    return head.prev == head;
  }

  return { add, forEach, isEmpty };
};
