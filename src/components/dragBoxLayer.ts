///<reference path="../reference.ts" />

module Plottable {

export type DragBoxCallback = (bounds: Bounds) => void;

export module Components {
  type _EdgeIndicator = {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };

  export class DragBoxLayer extends Components.SelectionBoxLayer {
    private _dragInteraction: Interactions.Drag;
    private _detectionEdgeT: d3.Selection<void>;
    private _detectionEdgeB: d3.Selection<void>;
    private _detectionEdgeL: d3.Selection<void>;
    private _detectionEdgeR: d3.Selection<void>;
    private _detectionCornerTL: d3.Selection<void>;
    private _detectionCornerTR: d3.Selection<void>;
    private _detectionCornerBL: d3.Selection<void>;
    private _detectionCornerBR: d3.Selection<void>;

    private _detectionRadius = 3;
    private _resizable = false;
    private _movable = false;
    protected _hasCorners = true;

    private _dragStartCallbacks: Utils.CallbackSet<DragBoxCallback>;
    private _dragCallbacks: Utils.CallbackSet<DragBoxCallback>;
    private _dragEndCallbacks: Utils.CallbackSet<DragBoxCallback>;

    /**
     * Constructs a DragBoxLayer.
     *
     * A DragBoxLayer is a SelectionBoxLayer with a built-in Drag Interaction.
     * A drag gesture will set the Bounds of the box.
     * If resizing is enabled using resizable(true), the edges of box can be repositioned.
     *
     * @constructor
     */
    constructor() {
      super();
      /*
       * Enable clipPath to hide _detectionEdge s and _detectionCorner s
       * that overlap with the edge of the DragBoxLayer. This prevents the
       * user's cursor from changing outside the DragBoxLayer, where they
       * wouldn't be able to grab the edges or corners for resizing.
       */
      this._clipPathEnabled = true;
      this.addClass("drag-box-layer");

      this._dragInteraction = new Interactions.Drag();
      this._setUpCallbacks();
      this._dragInteraction.attachTo(this);

      this._dragStartCallbacks = new Utils.CallbackSet<DragBoxCallback>();
      this._dragCallbacks = new Utils.CallbackSet<DragBoxCallback>();
      this._dragEndCallbacks = new Utils.CallbackSet<DragBoxCallback>();
    }

    private _setUpCallbacks() {
      let resizingEdges: _EdgeIndicator;
      let topLeft: Point;
      let bottomRight: Point;
      let lastEndPoint: Point;

      let DRAG_MODES = {
        newBox: 0,
        resize: 1,
        move: 2
      };
      let mode = DRAG_MODES.newBox;

      this._dragInteraction.onDragStart((startPoint: Point) => {
        resizingEdges = this._getResizingEdges(startPoint);

        let bounds = this.bounds();
        let isInsideBox = bounds.topLeft.x <= startPoint.x && startPoint.x <= bounds.bottomRight.x &&
                          bounds.topLeft.y <= startPoint.y && startPoint.y <= bounds.bottomRight.y;

        if (this.boxVisible() && (resizingEdges.top || resizingEdges.bottom || resizingEdges.left || resizingEdges.right)) {
          mode = DRAG_MODES.resize;
        } else if (this.boxVisible() && this.movable() && isInsideBox) {
          mode = DRAG_MODES.move;
        } else {
          mode = DRAG_MODES.newBox;
          this.bounds({
            topLeft: startPoint,
            bottomRight: startPoint
          });
        }

        this.boxVisible(true);
        bounds = this.bounds();
        // copy points so changes to topLeft and bottomRight don't mutate bounds
        topLeft = { x: bounds.topLeft.x, y: bounds.topLeft.y };
        bottomRight = { x: bounds.bottomRight.x, y: bounds.bottomRight.y };
        lastEndPoint = startPoint;
        this._dragStartCallbacks.callCallbacks(bounds);
      });

      this._dragInteraction.onDrag((startPoint: Point, endPoint: Point) => {
        switch (mode) {
          case DRAG_MODES.newBox:
            bottomRight.x = endPoint.x;
            bottomRight.y = endPoint.y;
            break;
          case DRAG_MODES.resize:
            if (resizingEdges.bottom) {
              bottomRight.y = endPoint.y;
            } else if (resizingEdges.top) {
              topLeft.y = endPoint.y;
            }

            if (resizingEdges.right) {
              bottomRight.x = endPoint.x;
            } else if (resizingEdges.left) {
              topLeft.x = endPoint.x;
            }
            break;
          case DRAG_MODES.move:
            let dx = endPoint.x - lastEndPoint.x;
            let dy = endPoint.y - lastEndPoint.y;
            topLeft.x += dx;
            topLeft.y += dy;
            bottomRight.x += dx;
            bottomRight.y += dy;
            lastEndPoint = endPoint;
            break;
        }

        this.bounds({
          topLeft: topLeft,
          bottomRight: bottomRight
        });

        this._dragCallbacks.callCallbacks(this.bounds());
      });

      this._dragInteraction.onDragEnd((startPoint: Point, endPoint: Point) => {
        if (mode === DRAG_MODES.newBox && startPoint.x === endPoint.x && startPoint.y === endPoint.y) {
          this.boxVisible(false);
        }

        this._dragEndCallbacks.callCallbacks(this.bounds());
      });
    }

    protected _setup() {
      super._setup();

      let createLine = () => this._box.append("line").style({
                               "opacity": 0,
                               "stroke": "pink"
                             });
      this._detectionEdgeT = createLine().classed("drag-edge-tb", true);
      this._detectionEdgeB = createLine().classed("drag-edge-tb", true);
      this._detectionEdgeL = createLine().classed("drag-edge-lr", true);
      this._detectionEdgeR = createLine().classed("drag-edge-lr", true);

      if (this._hasCorners) {
        let createCorner = () => this._box.append("circle")
                                     .style({
                                       "opacity": 0,
                                       "fill": "pink"
                                     });
        this._detectionCornerTL = createCorner().classed("drag-corner-tl", true);
        this._detectionCornerTR = createCorner().classed("drag-corner-tr", true);
        this._detectionCornerBL = createCorner().classed("drag-corner-bl", true);
        this._detectionCornerBR = createCorner().classed("drag-corner-br", true);
      }
    }

    private _getResizingEdges(p: Point) {
      let edges = {
        top: false,
        bottom: false,
        left: false,
        right: false
      };

      if (!this.resizable()) {
        return edges;
      }

      let bounds = this.bounds();
      let t = bounds.topLeft.y;
      let b = bounds.bottomRight.y;
      let l = bounds.topLeft.x;
      let r = bounds.bottomRight.x;
      let rad = this._detectionRadius;

      if (l - rad <= p.x && p.x <= r + rad) {
        edges.top = (t - rad <= p.y && p.y <= t + rad);
        edges.bottom = (b - rad <= p.y && p.y <= b + rad);
      }

      if (t - rad <= p.y && p.y <= b + rad) {
        edges.left = (l - rad <= p.x && p.x <= l + rad);
        edges.right = (r - rad <= p.x && p.x <= r + rad);
      }

      return edges;
    }

    public renderImmediately() {
      super.renderImmediately();
      if (this.boxVisible()) {
        let bounds = this.bounds();
        let t = bounds.topLeft.y;
        let b = bounds.bottomRight.y;
        let l = bounds.topLeft.x;
        let r = bounds.bottomRight.x;

        this._detectionEdgeT.attr({
          x1: l, y1: t, x2: r, y2: t,
          "stroke-width": this._detectionRadius * 2
        });
        this._detectionEdgeB.attr({
          x1: l, y1: b, x2: r, y2: b,
          "stroke-width": this._detectionRadius * 2
        });
        this._detectionEdgeL.attr({
          x1: l, y1: t, x2: l, y2: b,
          "stroke-width": this._detectionRadius * 2
        });
        this._detectionEdgeR.attr({
          x1: r, y1: t, x2: r, y2: b,
          "stroke-width": this._detectionRadius * 2
        });

        if (this._hasCorners) {
          this._detectionCornerTL.attr({ cx: l, cy: t, r: this._detectionRadius });
          this._detectionCornerTR.attr({ cx: r, cy: t, r: this._detectionRadius });
          this._detectionCornerBL.attr({ cx: l, cy: b, r: this._detectionRadius });
          this._detectionCornerBR.attr({ cx: r, cy: b, r: this._detectionRadius });
        }
        return this;
      }
    }

    /**
     * Gets the detection radius of the drag box in pixels.
     */
    public detectionRadius(): number;
    /**
     * Sets the detection radius of the drag box in pixels.
     *
     * @param {number} r
     * @return {DragBoxLayer} The calling DragBoxLayer.
     */
    public detectionRadius(r: number): DragBoxLayer;
    public detectionRadius(r?: number): any {
      if (r == null) {
        return this._detectionRadius;
      }
      if (r < 0) {
        throw new Error("detection radius cannot be negative.");
      }
      this._detectionRadius = r;
      this.render();
      return this;
    }

    /**
     * Gets whether or not the drag box is resizable.
     */
    public resizable(): boolean;
    /**
     * Sets whether or not the drag box is resizable.
     *
     * @param {boolean} canResize
     * @return {DragBoxLayer} The calling DragBoxLayer.
     */
    public resizable(canResize: boolean): DragBoxLayer;
    public resizable(canResize?: boolean): any {
      if (canResize == null) {
        return this._resizable;
      }
      this._resizable = canResize;
      this._setResizableClasses(canResize);
      return this;
    }

    // Sets resizable classes. Overridden by subclasses that only resize in one dimension.
    protected _setResizableClasses(canResize: boolean) {
      if (canResize) {
        this.addClass("x-resizable");
        this.addClass("y-resizable");
      } else {
        this.removeClass("x-resizable");
        this.removeClass("y-resizable");
      }
    }

    /**
     * Gets whether or not the drag box is movable.
     */
    public movable(): boolean;
    /**
     * Sets whether or not the drag box is movable.
     *
     * @param {boolean} movable
     * @return {DragBoxLayer} The calling DragBoxLayer.
     */
    public movable(movable: boolean): DragBoxLayer;
    public movable(movable?: boolean): any {
      if (movable == null) {
        return this._movable;
      }
      this._movable = movable;
      if (movable) {
        this.addClass("movable");
      } else {
        this.removeClass("movable");
      }
      return this;
    }

    /**
     * Sets the callback to be called when dragging starts.
     *
     * @param {DragBoxCallback} callback
     * @returns {DragBoxLayer} The calling DragBoxLayer.
     */
    public onDragStart(callback: DragBoxCallback) {
      this._dragStartCallbacks.add(callback);
      return this;
    }

    /**
     * Removes a callback to be called when dragging starts.
     *
     * @param {DragBoxCallback} callback
     * @returns {DragBoxLayer} The calling DragBoxLayer.
     */
    public offDragStart(callback: DragBoxCallback) {
      this._dragStartCallbacks.delete(callback);
      return this;
    }

    /**
     * Sets a callback to be called during dragging.
     *
     * @param {DragBoxCallback} callback
     * @returns {DragBoxLayer} The calling DragBoxLayer.
     */
    public onDrag(callback: DragBoxCallback) {
      this._dragCallbacks.add(callback);
      return this;
    }

    /**
     * Removes a callback to be called during dragging.
     *
     * @param {DragBoxCallback} callback
     * @returns {DragBoxLayer} The calling DragBoxLayer.
     */
    public offDrag(callback: DragBoxCallback) {
      this._dragCallbacks.delete(callback);
      return this;
    }

    /**
     * Sets a callback to be called when dragging ends.
     *
     * @param {DragBoxCallback} callback
     * @returns {DragBoxLayer} The calling DragBoxLayer.
     */
    public onDragEnd(callback: DragBoxCallback) {
      this._dragEndCallbacks.add(callback);
      return this;
    }

    /**
     * Removes a callback to be called when dragging ends.
     *
     * @param {DragBoxCallback} callback
     * @returns {DragBoxLayer} The calling DragBoxLayer.
     */
    public offDragEnd(callback: DragBoxCallback) {
      this._dragEndCallbacks.delete(callback);
      return this;
    }

    /**
     * Gets the internal Interactions.Drag of the DragBoxLayer.
     */
    public dragInteraction() {
      return this._dragInteraction;
    }

    /**
     * Enables or disables the interaction and drag box.
     */
    public enabled(enabled: boolean): DragBoxLayer;
    /**
     * Gets the enabled state.
     */
    public enabled(): boolean;
    public enabled(enabled?: boolean): any {
      if (enabled == null) {
        return this._dragInteraction.enabled();
      }
      this._dragInteraction.enabled(enabled);
      return this;
    }
  }
}
}
