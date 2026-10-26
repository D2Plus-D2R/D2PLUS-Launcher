/**
 * Huffman tree and lookup table for D2R item code encoding/decoding.
 *
 * Used in v105 (Blizzless) for 3-character item codes.
 * Alphabet: [a-z0-9 ] — 37 symbols.
 * Space (' ') is the most frequent (2 bits), 'j' is the rarest (9 bits).
 */
export const HUFFMAN_TREE = [
    [
        [
            [['w', 'u'], [['8', ['y', ['5', ['j']]]], 'h']],
            ['s', [['2', 'n'], 'x']],
        ],
        [
            [['c', ['k', 'f']], 'b'],
            [['t', 'm'], ['9', '7']],
        ],
    ],
    [
        ' ',
        [
            [[['e', 'd'], 'p'], ['g', [[['z', 'q'], '3'], ['v', '6']]]],
            [['r', 'l'], ['a', [['1', ['4', '0']], ['i', 'o']]]],
        ],
    ],
];
export const HUFFMAN_LOOKUP = {
    '0': { v: 223, l: 8 },
    '1': { v: 31, l: 7 },
    '2': { v: 12, l: 6 },
    '3': { v: 91, l: 7 },
    '4': { v: 95, l: 8 },
    '5': { v: 104, l: 8 },
    '6': { v: 123, l: 7 },
    '7': { v: 30, l: 5 },
    '8': { v: 8, l: 6 },
    '9': { v: 14, l: 5 },
    ' ': { v: 1, l: 2 },
    a: { v: 15, l: 5 },
    b: { v: 10, l: 4 },
    c: { v: 2, l: 5 },
    d: { v: 35, l: 6 },
    e: { v: 3, l: 6 },
    f: { v: 50, l: 6 },
    g: { v: 11, l: 5 },
    h: { v: 24, l: 5 },
    i: { v: 63, l: 7 },
    j: { v: 232, l: 9 },
    k: { v: 18, l: 6 },
    l: { v: 23, l: 5 },
    m: { v: 22, l: 5 },
    n: { v: 44, l: 6 },
    o: { v: 127, l: 7 },
    p: { v: 19, l: 5 },
    q: { v: 155, l: 8 },
    r: { v: 7, l: 5 },
    s: { v: 4, l: 4 },
    t: { v: 6, l: 5 },
    u: { v: 16, l: 5 },
    v: { v: 59, l: 7 },
    w: { v: 0, l: 5 },
    x: { v: 28, l: 5 },
    y: { v: 40, l: 7 },
    z: { v: 27, l: 8 },
};
//# sourceMappingURL=huffman.js.map