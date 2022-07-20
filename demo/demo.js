[
  // {
  //   pgn: 'e4 c5 Nf3 d6 e5 Nc6 exd6 Qxd6 Nc3 Nf6 d3 g6 Bf4 Qd7 Be2 Bg7 Nb5 O-O O-O a6 Nc3 Nh5 Bd2 Nf6 Ng5 Nd5 Nce4 Nd4 Rb1 b6 Bg4 e6 Nf3 Qe7 Nxd4 Bxd4 c3 Bg7 Bg5 Nf6 Bh3 h6 Bf4 Nxe4 dxe4 Rd8 Qe2 Bb7 Qe3 Rd7 Bxh6 Rad8 f3 Rd3 Qc1 Qh4 Bxg7 Kxg7 Qc2 Rd2 Qb3 a5 Rbd1 Rxd1 Rxd1 Rxd1+ Qxd1 Qe7 Qe2 Bc6 Qd3 b5 g3 c4 Qd4+ Qf6 Qxf6+ Kxf6 Kf2 Ke5 Ke3 f5 f4+ Kf6 e5+ Ke7 Bf1 Kf7 Be2 Be4 Bf3 Ke7 Bxe4 fxe4 Kxe4 Kf7 f5 Ke7 f6+ Kf7 Kd4 g5 Kc5 g4 Kxb5 Ke8 Kxc4 Kf7',
  // },
  // {
  //   pgn: 'e4 c5',
  //   initialPly: 'last',
  // },
  {
    pgn: `[Event "Study chapter"]
[Site "https://lichess.org/study/2DLDBqn1/ul1KzKkR"]
[Result "*"]
[UTCDate "2022.07.20"]
[UTCTime "09:05:59"]
[Variant "Standard"]
[ECO "C30"]
[Opening "King's Gambit"]
[Annotator "https://lichess.org/@/thibault"]

1. e4 e5 (1... d5 2. exd5) 2. f4 *`,
    showMoves: true,
  },
].forEach((cfg, i) => LichessPgnViewer(document.querySelector(`.viewers > div:nth-child(${i + 1})`), cfg));
