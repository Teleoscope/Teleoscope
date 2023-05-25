import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const Histogram = ({ data, height = 100 }) => {
  const margin = 10;
  const ref = useRef();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(ref.current.parentNode.offsetWidth - 2 * margin);
  }, []);

  useEffect(() => {
    const svg = d3.select(ref.current);
    const histogram = d3.histogram().value(d => d).thresholds(10);
    const bins = histogram(data);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([height, 0]);

    const xDomain = [
      d3.min(data) - (d3.max(data) - d3.min(data)) / 20,
      d3.max(data) + (d3.max(data) - d3.min(data)) / 20
    ];

    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([0, width]);

    svg
      .attr("width", width)
      .attr("height", height)
      .selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", d => xScale(d.x0))
      .attr("y", d => yScale(d.length))
      .attr("height", d => yScale(0) - yScale(d.length))
      .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1));

    // Add the x Axis
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(xScale));

  }, [data, width]);

  return (
    <svg style={{ margin: `${margin}px`}} ref={ref}></svg>
  );
}

export default Histogram;
