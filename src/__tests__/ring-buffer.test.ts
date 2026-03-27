import { RingBuffer } from '@/lib/data/store';
import { describe, expect, it } from 'vitest';

describe('RingBuffer', () => {
  it('starts empty', () => {
    const buf = new RingBuffer<number>(4);
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it('append adds items in order', () => {
    const buf = new RingBuffer<number>(4);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.toArray()).toEqual([1, 2, 3]);
    expect(buf.size).toBe(3);
  });

  it('evicts oldest item when capacity is exceeded', () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4); // evicts 1
    expect(buf.toArray()).toEqual([2, 3, 4]);
    expect(buf.size).toBe(3);
  });

  it('evicts oldest across multiple overflow cycles', () => {
    const buf = new RingBuffer<number>(3);
    for (let i = 1; i <= 7; i++) buf.push(i);
    // After 7 pushes with capacity 3: [5, 6, 7]
    expect(buf.toArray()).toEqual([5, 6, 7]);
  });

  it('returns correct slice — toArray reflects insertion order', () => {
    const buf = new RingBuffer<string>(4);
    buf.push('a');
    buf.push('b');
    buf.push('c');
    buf.push('d');
    buf.push('e'); // evicts 'a'
    expect(buf.toArray()).toEqual(['b', 'c', 'd', 'e']);
  });

  it('isFull is false when not at capacity', () => {
    const buf = new RingBuffer<number>(5);
    buf.push(1);
    expect(buf.isFull).toBe(false);
  });

  it('isFull is true when at capacity', () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.isFull).toBe(true);
  });

  it('last() returns the most recently added item', () => {
    const buf = new RingBuffer<number>(5);
    buf.push(10);
    buf.push(20);
    buf.push(30);
    expect(buf.last()).toBe(30);
  });

  it('last() returns undefined on empty buffer', () => {
    const buf = new RingBuffer<number>(5);
    expect(buf.last()).toBeUndefined();
  });

  it('clear resets the buffer', () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
    expect(buf.isFull).toBe(false);
  });

  it('handles capacity of 1 correctly', () => {
    const buf = new RingBuffer<number>(1);
    buf.push(99);
    buf.push(100);
    expect(buf.toArray()).toEqual([100]);
    expect(buf.size).toBe(1);
  });
});
