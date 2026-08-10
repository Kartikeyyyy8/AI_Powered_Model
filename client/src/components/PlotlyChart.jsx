import React from 'react';
import Plot from 'react-plotly.js';

const PlotlyChart = ({
  figure,
  height = 350
}) => {

  if (!figure) {

    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)'
        }}
      >
        No chart data available
      </div>
    );

  }

  return (

    <Plot
      data={figure.data || []}

      layout={{
        ...(figure.layout || {}),
        autosize: true,

        paper_bgcolor:
          'rgba(0,0,0,0)',

        plot_bgcolor:
          'rgba(0,0,0,0)',

        font: {
          color: '#cbd5e1'
        }
      }}

      config={{
        responsive: true,
        displaylogo: false,
        displayModeBar: true
      }}

      style={{
        width: '100%',
        height: `${height}px`
      }}

      useResizeHandler={true}
    />

  );

};

export default PlotlyChart;