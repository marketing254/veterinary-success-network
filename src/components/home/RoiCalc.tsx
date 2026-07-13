"use client";

import { useState } from "react";

const DUES = 588;

export default function RoiCalc() {
  const [deals, setDeals] = useState(2);
  const [avg, setAvg] = useState(500);

  const save = deals * avg;
  const net = save - DUES;
  const fill = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`;

  return (
    <div className="calc reveal">
      <div className="grid">
        <div>
          <div className="crow">
            <div className="lab">
              <span>Partner deals you&apos;d actually use in year 1</span>
              <output>{deals}</output>
            </div>
            <input
              type="range"
              min={1}
              max={6}
              value={deals}
              style={{ ["--fill" as string]: fill(deals, 1, 6) }}
              onChange={(e) => setDeals(+e.target.value)}
            />
          </div>
          <div className="crow">
            <div className="lab">
              <span>Average saving per deal</span>
              <output>${avg}</output>
            </div>
            <input
              type="range"
              min={100}
              max={1500}
              step={50}
              value={avg}
              style={{ ["--fill" as string]: fill(avg, 100, 1500) }}
              onChange={(e) => setAvg(+e.target.value)}
            />
            <div className="cnote">
              Anchor: the real Ekwa founding deal = $500 total. Set this to what you&apos;d realistically
              use.
            </div>
          </div>
          <div className="crow" style={{ marginBottom: 0 }}>
            <div className="lab">
              <span>Founding membership</span>
              <output>$49/mo · $588/yr</output>
            </div>
          </div>
        </div>
        <div className="cout">
          <div className="t">Your estimated first-year net benefit</div>
          <div className="big">
            {net < 0 ? "−$" : "$"}
            {Math.abs(net).toLocaleString()}
          </div>
          <span className="mult">{(save / DUES).toFixed(1)}× your dues</span>
          <small>
            An estimate from the numbers you set; actual savings depend on which member deals you
            use. Excludes the value of the hotline, library and CE.
          </small>
        </div>
      </div>
    </div>
  );
}
