///<reference path="../testReference.ts" />

describe("Plots", () => {
  // HACKHACK #1798: beforeEach being used below
  describe("LinePlot", () => {
    it("entities() with NaN in data", () => {
      const svg = TestMethods.generateSVG(500, 500);
      const dataWithNaN = [
        { foo: 0.0, bar: 0.0 },
        { foo: 0.2, bar: 0.2 },
        { foo: 0.4, bar: NaN },
        { foo: 0.6, bar: 0.6 },
        { foo: 0.8, bar: 0.8 }
      ];

      const xScale = new Plottable.Scales.Linear();
      xScale.domain([0, 1]);
      const yScale = new Plottable.Scales.Linear();
      yScale.domain([0, 1]);

      const linePlot = new Plottable.Plots.Line();
      linePlot.addDataset(new Plottable.Dataset(dataWithNaN));
      linePlot.x((d: any) => d.foo, xScale);
      linePlot.y((d: any) => d.bar, yScale);
      linePlot.renderTo(svg);

      const entities = linePlot.entities();

      const expectedLength = dataWithNaN.length - 1;
      assert.lengthOf(entities, expectedLength, "NaN data was not returned");

      svg.remove();
    });
  });

  describe("LinePlot", () => {
    // HACKHACK #1798: beforeEach being used below
    it("renders correctly with no data", () => {
      const svg = TestMethods.generateSVG(400, 400);
      const xScale = new Plottable.Scales.Linear();
      const yScale = new Plottable.Scales.Linear();
      const plot = new Plottable.Plots.Line();
      plot.x((d: any) => d.x, xScale);
      plot.y((d: any) => d.y, yScale);
      assert.doesNotThrow(() => plot.renderTo(svg), Error);
      assert.strictEqual(plot.width(), 400, "was allocated width");
      assert.strictEqual(plot.height(), 400, "was allocated height");
      svg.remove();
    });
  });

  describe("LinePlot", () => {
    let svg: d3.Selection<void>;
    let xScale: Plottable.Scales.Linear;
    let yScale: Plottable.Scales.Linear;
    let xAccessor: any;
    let yAccessor: any;
    let colorAccessor: any;
    const twoPointData = [{foo: 0, bar: 0}, {foo: 1, bar: 1}];
    let simpleDataset: Plottable.Dataset;
    let linePlot: Plottable.Plots.Line<number>;
    let renderArea: d3.Selection<void>;

    before(() => {
      xScale = new Plottable.Scales.Linear();
      xScale.domain([0, 1]);
      yScale = new Plottable.Scales.Linear();
      yScale.domain([0, 1]);
      xAccessor = (d: any) => d.foo;
      yAccessor = (d: any) => d.bar;
      colorAccessor = (d: any, i: number, m: any) => d3.rgb(d.foo, d.bar, i).toString();
    });

    beforeEach(() => {
      svg = TestMethods.generateSVG(500, 500);
      simpleDataset = new Plottable.Dataset(twoPointData);
      linePlot = new Plottable.Plots.Line<number>();
      linePlot.addDataset(simpleDataset);
      linePlot.x(xAccessor, xScale)
              .y(yAccessor, yScale)
              .attr("stroke", colorAccessor)
              .renderTo(svg);
      renderArea = (<any> linePlot)._renderArea;
    });

    it("draws a line correctly", () => {
      const linePath = renderArea.select(".line");
      assert.strictEqual(TestMethods.normalizePath(linePath.attr("d")), "M0,500L500,0", "line d was set correctly");
      assert.strictEqual(linePath.style("fill"), "none", "line fill renders as \"none\"");
      svg.remove();
    });

    it("attributes set appropriately from accessor", () => {
      const areaPath = renderArea.select(".line");
      assert.strictEqual(areaPath.attr("stroke"), "#000000", "stroke set correctly");
      svg.remove();
    });

    it("attributes can be changed by projecting new accessor and re-render appropriately", () => {
      const newColorAccessor = () => "pink";
      linePlot.attr("stroke", newColorAccessor);
      linePlot.renderTo(svg);
      const linePath = renderArea.select(".line");
      assert.strictEqual(linePath.attr("stroke"), "pink", "stroke changed correctly");
      svg.remove();
    });

    it("attributes can be changed by projecting attribute accessor (sets to first datum attribute)", () => {
      const data = JSON.parse(JSON.stringify(twoPointData)); // deep copy to not affect other tests
      data.forEach(function(d: any) { d.stroke = "pink"; });
      simpleDataset.data(data);
      linePlot.attr("stroke", (d) => d.stroke);
      const linePath = renderArea.select(".line");
      assert.strictEqual(linePath.attr("stroke"), "pink", "stroke set to uniform stroke color");

      data[0].stroke = "green";
      simpleDataset.data(data);
      assert.strictEqual(linePath.attr("stroke"), "green", "stroke set to first datum stroke color");
      svg.remove();
    });

    it("correctly handles NaN and undefined x and y values", () => {
      const lineData = [
        { foo: 0.0, bar: 0.0 },
        { foo: 0.2, bar: 0.2 },
        { foo: 0.4, bar: 0.4 },
        { foo: 0.6, bar: 0.6 },
        { foo: 0.8, bar: 0.8 }
      ];
      simpleDataset.data(lineData);
      const linePath = renderArea.select(".line");
      const dOriginal = TestMethods.normalizePath(linePath.attr("d"));

      function assertCorrectPathSplitting(msgPrefix: string) {
        const d = TestMethods.normalizePath(linePath.attr("d"));
        const pathSegements = d.split("M").filter((segment) => segment !== "");
        assert.lengthOf(pathSegements, 2, msgPrefix + " split path into two segments");
        const firstSegmentContained = dOriginal.indexOf(pathSegements[0]) >= 0;
        assert.isTrue(firstSegmentContained, "first path segment is a subpath of the original path");
        const secondSegmentContained = dOriginal.indexOf(pathSegements[1]) >= 0;
        assert.isTrue(secondSegmentContained, "second path segment is a subpath of the original path");
      }

      const dataWithNaN = lineData.slice();
      dataWithNaN[2] = { foo: 0.4, bar: NaN };
      simpleDataset.data(dataWithNaN);
      assertCorrectPathSplitting("y=NaN");
      dataWithNaN[2] = { foo: NaN, bar: 0.4 };
      simpleDataset.data(dataWithNaN);
      assertCorrectPathSplitting("x=NaN");

      const dataWithUndefined = lineData.slice();
      dataWithUndefined[2] = { foo: 0.4, bar: undefined };
      simpleDataset.data(dataWithUndefined);
      assertCorrectPathSplitting("y=undefined");
      dataWithUndefined[2] = { foo: undefined, bar: 0.4 };
      simpleDataset.data(dataWithUndefined);
      assertCorrectPathSplitting("x=undefined");

      svg.remove();
    });

    describe("selections()", () => {
      it("retrieves all dataset selections with no args", () => {
        const dataset3 = new Plottable.Dataset([
          { foo: 0, bar: 1 },
          { foo: 1, bar: 0.95 }
        ]);
        linePlot.addDataset(dataset3);

        const allLines = linePlot.selections();
        assert.strictEqual(allLines.size(), 2, "all lines retrieved");

        svg.remove();
      });

      it("retrieves correct selections", () => {
        const dataset3 = new Plottable.Dataset([
          { foo: 0, bar: 1 },
          { foo: 1, bar: 0.95 }
        ]);
        linePlot.addDataset(dataset3);

        const allLines = linePlot.selections([dataset3]);
        assert.strictEqual(allLines.size(), 1, "all lines retrieved");
        const selectionData = allLines.data();
        assert.include(selectionData, dataset3.data(), "third dataset data in selection data");

        svg.remove();
      });

      it("skips invalid Dataset", () => {
        const dataset3 = new Plottable.Dataset([
          { foo: 0, bar: 1 },
          { foo: 1, bar: 0.95 }
        ]);
        linePlot.addDataset(dataset3);
        const dummyDataset = new Plottable.Dataset([]);

        const allLines = linePlot.selections([dataset3, dummyDataset]);
        assert.strictEqual(allLines.size(), 1, "all lines retrieved");
        const selectionData = allLines.data();
        assert.include(selectionData, dataset3.data(), "third dataset data in selection data");

        svg.remove();
      });

    });

    describe("entities()", () => {
      it("retrieves correct data", () => {
        const dataset3 = new Plottable.Dataset([
          { foo: 0, bar: 1 },
          { foo: 1, bar: 0.95 }
        ]);
        linePlot.addDataset(dataset3);

        const nodes = linePlot.entities().map((entity) => entity.selection.node());
        const uniqueNodes: EventTarget[] = [];
        nodes.forEach((node) => {
          if (uniqueNodes.indexOf(node) === -1) {
            uniqueNodes.push(node);
          }
        });
        assert.lengthOf(uniqueNodes, linePlot.datasets().length, "one Element per Dataset");
        svg.remove();
      });
    });

    describe("entityNearest()", () => {
      let lines: d3.Selection<void>;
      let d0: any, d1: any;
      let d0Px: Plottable.Point, d1Px: Plottable.Point;
      let dataset2: Plottable.Dataset;

      beforeEach(() => {
        dataset2 = new Plottable.Dataset([
          { foo: 0, bar: 0.75 },
          { foo: 1, bar: 0.25 }
        ]);

        linePlot.addDataset(dataset2);

        lines = d3.selectAll(".line-plot .line");
        d0 = dataset2.data()[0];
        d0Px = {
          x: xScale.scale(xAccessor(d0)),
          y: yScale.scale(yAccessor(d0))
        };

        d1 = dataset2.data()[1];
        d1Px = {
          x: xScale.scale(xAccessor(d1)),
          y: yScale.scale(yAccessor(d1))
        };
      });

      it("returns nearest Entity", () => {
        let expected: Plottable.Plots.PlotEntity = {
          datum: d0,
          index: 0,
          dataset: dataset2,
          position: d0Px,
          selection: d3.selectAll([lines[0][1]]),
          component: linePlot
        };

        let closest = linePlot.entityNearest({x: d0Px.x, y: d0Px.y - 1});
        TestMethods.assertPlotEntitiesEqual(closest, expected, "if above a point, it is closest");

        closest = linePlot.entityNearest({x: d0Px.x, y: d0Px.y + 1});
        TestMethods.assertPlotEntitiesEqual(closest, expected, "if below a point, it is closest");

        closest = linePlot.entityNearest({x: d0Px.x + 1, y: d0Px.y + 1});
        TestMethods.assertPlotEntitiesEqual(closest, expected, "if right of a point, it is closest");

        expected = {
          datum: d1,
          index: 1,
          dataset: dataset2,
          position: d1Px,
          selection: d3.selectAll([lines[0][1]]),
          component: linePlot
        };

        closest = linePlot.entityNearest({x: d1Px.x - 1, y: d1Px.y});
        TestMethods.assertPlotEntitiesEqual(closest, expected, "if left of a point, it is closest");

        svg.remove();
      });

      it("considers only in-view points", () => {
        xScale.domain([0.25, 1]);

        const expected: Plottable.Plots.PlotEntity = {
          datum: d1,
          index: 1,
          dataset: dataset2,
          position: {
            x: xScale.scale(xAccessor(d1)),
            y: yScale.scale(yAccessor(d1))
          },
          selection: d3.selectAll([lines[0][1]]),
          component: linePlot
        };

        const closest = linePlot.entityNearest({ x: xScale.scale(0.25), y: d1Px.y });
        TestMethods.assertPlotEntitiesEqual(closest, expected, "only in-view points are considered");

        svg.remove();
      });

      it("returns undefined if no Entities are visible", () => {
        linePlot = new Plottable.Plots.Line<number>();
        const closest = linePlot.entityNearest({ x: d0Px.x, y: d0Px.y });
        assert.isUndefined(closest, "returns undefined if no Entity can be found");
        svg.remove();
      });
    });

    it("retains original classes when class is projected", () => {
      const newClassProjector = () => "pink";
      linePlot.attr("class", newClassProjector);
      linePlot.renderTo(svg);
      const linePath = renderArea.select(".line");
      assert.isTrue(linePath.classed("pink"), "'pink' class is applied");
      assert.isTrue(linePath.classed("line"), "'line' class is retained");
      svg.remove();
    });
  });
});
