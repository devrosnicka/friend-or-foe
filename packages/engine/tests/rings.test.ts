import { describe, expect, it } from 'vitest';
import { unionRings } from '../src/map/rings';

describe('unionRings', () => {
  it('spojí dva obrysy sdílející hranu do jednoho', () => {
    // 0—1—2      levý čtverec 0,1,4,5   pravý čtverec 1,2,3,4
    // |  |  |    společná hrana 1—4
    // 5—4—3
    const outline = unionRings([
      [0, 1, 4, 5],
      [1, 2, 3, 4],
    ]);

    expect(outline).not.toBeNull();
    expect(new Set(outline)).toEqual(new Set([0, 1, 2, 3, 4, 5]));
    expect(outline).toHaveLength(6);
  });

  it('samotný obrys projde beze změny', () => {
    expect(unionRings([[0, 1, 2, 3]])).toEqual([0, 1, 2, 3]);
  });

  it('odmítne obrysy, které se dotýkají jen v jednom bodě', () => {
    expect(
      unionRings([
        [0, 1, 2],
        [2, 3, 4],
      ]),
    ).toBeNull();
  });

  it('odmítne dva obrysy bez společné hrany', () => {
    expect(
      unionRings([
        [0, 1, 2],
        [3, 4, 5],
      ]),
    ).toBeNull();
  });

  it('odmítne obrysy s opačným směrem obchůzky, které se celé vyruší', () => {
    expect(
      unionRings([
        [0, 1, 2],
        [2, 1, 0],
      ]),
    ).toBeNull();
  });

  it('odmítne tutéž hranu vedenou dvakrát stejným směrem', () => {
    expect(
      unionRings([
        [0, 1, 2],
        [0, 1, 2],
      ]),
    ).toBeNull();
  });
});
