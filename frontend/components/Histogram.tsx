import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import styles from '@/styles/d3tooltip.module.css'; // Import the CSS module

const Histogram = ({ data }) => {

  const ref = useRef();
  const w = 50;
  const h = 15;
  
  useEffect(() => {
    const svg = d3.select(ref.current);

    // Define the margins, width, and height of the SVG
    const margin = { top: 2, right: 2, bottom: 2, left: 2 };
    const width = w - margin.left - margin.right;
    const height = h - margin.top - margin.bottom;

    // Prepare the data for the histogram
    const rankData = data.map(d => d[1]);

    // Create a tooltip div that is initially hidden
    const tooltip = d3.select("body").append("div")
      .attr("class", styles.tooltip)
      .style("opacity", 0);


    const x = d3.scaleLinear()
      .domain([0, 1])
      .rangeRound([0, width])
      .nice();

      const thresholds = Array.from({ length: 11 }, (_, i) => parseFloat((i * 0.1).toFixed(1)));


    // Create the histogram bins
    const bins = d3.histogram()
      .domain(x.domain())
      .thresholds(thresholds)
      (rankData);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([height, 0]);

    
    const bar = svg.selectAll(".bar")
    .data(bins)
    .join("g")
    .attr("class", "bar")
    .attr("transform", d => `translate(${x(d.x0)}, 0)`);

    bar.append("rect")
    .attr("x", 1)
    .attr("y", 0)
    .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
    .attr("height", height)
    .attr("fill", d => "#F0F0F0") // Fill with white for zero bins

    // Add the visible bars
    bar.append("rect")
    .attr("x", 1)
    .attr("y", d => y(d.length))
    .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
    .attr("height", d => height - y(d.length))
    .attr("fill", "black");

    // Add an invisible layer to capture mouse events
    bar.append("rect")
    .attr("x", 1)
    .attr("y", 0)
    .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
    .attr("height", height)
    .attr("fill", d => d.length === 0 ? "white" : "transparent") // Fill with white for zero bins
    .style("opacity", 0) // Make this layer invisible
    .on("mouseover", (event, d) => {
        tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
        tooltip.html(`Similarity: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)} <br/> Count: ${d.length}`)
        .style("left", (event.pageX) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", (d) => {
        tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });
    

    // // Add the x-axis
    // svg.append("g")
    //     .attr("class", "x axis")
    //     .attr("transform", `translate(0, ${height})`)
    //     .call(d3.axisBottom(x));

    // // Add the y-axis
    // svg.append("g")
    //     .attr("class", "y axis")
    //     .call(d3.axisLeft(y));
  }, [data]);

  return (
    <svg ref={ref} width={`${w}`} height={`${h}`} />
  );
};

export default Histogram;
