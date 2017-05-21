window.ui = window.ui || {}
ui.flipletCharts = ui.flipletCharts || {};
Fliplet().then(function(){
  $('[data-chart-scatter-id]').each(function (i, el) {
    var chartId = $(this).data('chart-scatter-id');
    var data = Fliplet.Widget.getData( chartId );
    var $container = $(el);
    var refreshTimeout = 5000;
    var updateDateFormat = 'hh:mm:ss a';

    function resetData() {
      data.entries = [];
      data.totalEntries = 0;
    }

    function refreshData() {
      return Fliplet.DataSources.fetchWithOptions(data.dataSourceQuery).then(function(result){
        data.entries = [];
        data.totalEntries = 0;
        if (result.dataSource.columns.indexOf(data.dataSourceQuery.columns.xAxis) < 0 || result.dataSource.columns.indexOf(data.dataSourceQuery.columns.yAxis) < 0) {
          return Promise.resolve();
        }
        result.dataSourceEntries.forEach(function(row) {
          var x;
          if (data.dataFormat === 'timestamp') {
            x = new Date(row[data.dataSourceQuery.columns.xAxis] || 0).getTime()
          } else {
            x = parseInt(row[data.dataSourceQuery.columns.xAxis], 10) || 0;
          }
          var y = parseInt(row[data.dataSourceQuery.columns.yAxis], 0) || 0;
          data.entries.push([x, y]);
        });
        // SAVES THE TOTAL NUMBER OF ROW/ENTRIES
        data.totalEntries = data.entries.length;

        return Promise.resolve();
      });
    }

    function refreshChartInfo() {
      // Update total count
      $container.find('.total').html(data.totalEntries);
      // Update last updated time
      $container.find('.updatedAt').html(moment().format(updateDateFormat));
    }

    function refreshChart() {
      // Retrieve chart object
      var chart = ui.flipletCharts[chartId];
      // Update values
      chart.series[0].setData(data.entries);
      refreshChartInfo();
    }

    function getLatestData() {
      setTimeout(function(){
        refreshData().then(function(){
          refreshChart();
          if (data.autoRefresh) {
            getLatestData();
          }
        });
      }, refreshTimeout);
    }

    function drawChart() {
      var colors = [
        '#337AB7', '#5BC0DE', '#5CB85C', '#F0AD4E', '#C9302C',
        '#293954', '#2E6F82', '#3D7A3D', '#B07623', '#963732'
      ];
      colors.forEach(function eachColor (color, index) {
        if (!Fliplet.Themes) {
          return;
        }
        colors[index] = Fliplet.Themes.Current.get('chartColor'+(index+1)) || color;
      });
      var chartOpt = {
        chart: {
          type: 'scatter',
          zoomType: 'xy',
          renderTo: $container.find('.chart-scatter-container')[0],
          style: {
            fontFamily: (Fliplet.Themes && Fliplet.Themes.Current.get('bodyFontFamily')) || 'sans-serif'
          },
          events: {
            load: function(){
              refreshChartInfo();
              if (data.autoRefresh) {
                getLatestData();
              }
            }
          }
        },
        colors: colors,
        title: {
          text: ''
        },
        subtitle: {
          text: ''
        },
        xAxis: {
          title: {
            text: data.xAxisTitle || data.dataSourceQuery.xAxis,
            enabled: data.xAxisTitle !== ''
          },
          labels: {
            formatter: function(){
              if (data.dataFormat === 'timestamp') {
                return moment(this.value).format('YYYY-MM-DD');
              }
              return this.value;
            }
          },
          startOnTick: true,
          endOnTick: true,
          showLastLabel: true
        },
        yAxis: {
          title: {
            text: data.yAxisTitle || data.dataSourceQuery.yAxis,
            enabled: data.yAxisTitle !== ''
          }
        },
        tooltip: {
          enabled: data.showDataValues,
          headerFormat: '',
          pointFormat: [
            '<strong>',
            (data.xAxisTitle !== ''
              ? data.xAxisTitle
              : data.dataSourceQuery.xAxis),
            '</strong> ',
            (data.dataFormat === 'timestamp'
              ? '{point.x:%Y-%m-%d %H:%M:%S}'
              : '{point.x}'),
            '<br><strong>',
            (data.yAxisTitle !== ''
              ? data.yAxisTitle
              : data.dataSourceQuery.yAxis),
            '</strong>: {point.y}'
          ].join('')
        },
        plotOptions: {
          scatter: {
            marker: {
              radius: 5,
              states: {
                hover: {
                  enabled: true,
                  lineColor: 'rgb(100,100,100)'
                }
              }
            },
            states: {
              hover: {
                marker: {
                  enabled: false
                }
              }
            }
          }
        },
        series: [{
          data: data.entries
        }],
        legend: {
          enabled: false
        },
        credits: {
          enabled: false
        }
      };
      // Create and save chart object
      ui.flipletCharts[chartId] = new Highcharts.Chart(chartOpt);
    }

    refreshData().then(drawChart);
  });
  var debounceLoad = _.debounce(init, 500);

  Fliplet.Studio.onEvent(function (event) {
    if (event.detail.event === 'reload-widget-instance') {
      debounceLoad();
    }
  });
});