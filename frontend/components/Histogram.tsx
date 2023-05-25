import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const Histogram = ({ data, height = 100 }) => {
  const ref = useRef();
  const [width, setWidth] = useState(0);
  const margin = { top: 10, bottom: 30, left: 30, right: 10 };  // Define margins

  useEffect(() => {
    setWidth(ref.current.parentNode.offsetWidth);
  }, []);

  useEffect(() => {
    const svg = d3.select(ref.current);
    const histogram = d3.histogram().value(d => d).thresholds(10);
    const bins = histogram(data);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([height - margin.bottom, margin.top]);  // Subtract margins from height

    const xDomain = [
      d3.min(data) - (d3.max(data) - d3.min(data)) / 20,
      d3.max(data) + (d3.max(data) - d3.min(data)) / 20
    ];

    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([margin.left, width - margin.right]);  // Subtract margins from width

    svg
      .attr("width", width)
      .attr("height", height)
      .selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", d => xScale(d.x0))
      .attr("y", d => yScale(d.length))
      .attr("height", d => yScale(0) - yScale(d.length))  // Bars height adjusted
      .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1));

    // Add the x Axis
    svg.append("g")
      .attr("transform", "translate(0," + (height - margin.bottom) + ")")  // Position axis at the bottom
      .call(
        d3.axisBottom(xScale).ticks(width / 80)  // Limit the number of ticks
      );
  }, [data, width]);

  return (
    <svg ref={ref}></svg>
  );
}

export default Histogram;
