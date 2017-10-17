import { Router } from "@angular/router";
import { Subscription } from "rxjs/Subscription";
import { Observable } from "rxjs/Observable";
import { Component, OnInit, Input, ViewEncapsulation } from "@angular/core";
import { D3Service, D3, HierarchyCircularNode } from "d3-ng2-service";
import { ColorService } from "../../../shared/services/ui/color.service"
import { UIService } from "../../../shared/services/ui/ui.service"
import { IDataVisualizer } from "../mapping.interface"
import { UserFactory } from "../../../shared/services/user.factory";

@Component({
    selector: "circles",
    templateUrl: "./mapping.circles.component.html",
    styleUrls: ["./mapping.circles.component.css"],
    encapsulation: ViewEncapsulation.None
})

export class MappingCirclesComponent implements OnInit, IDataVisualizer {

    private d3: D3;

    // @ViewChild("tooltip")
    // public tooltip: TooltipComponent;
    public datasetId: string;
    public width: number;
    public height: number;

    public margin: number;
    public zoom$: Observable<number>
    public fontSize$: Observable<number>;

    private zoomSubscription: Subscription;

    constructor(public d3Service: D3Service, public colorService: ColorService, public uiService: UIService, public router: Router, private userFactory: UserFactory) {
        this.d3 = d3Service.getD3();
    }

    ngOnInit() {

    }

    ngOnDestroy() {
        if (this.zoomSubscription) {
            this.zoomSubscription.unsubscribe();
        }
    }

    draw(data: any) {

        let d3 = this.d3;
        let colorService = this.colorService;
        let uiService = this.uiService;
        let width = this.width;
        let zoom$ = this.zoom$;
        let fontSize$ = this.fontSize$;
        let marginSize = this.margin
        let datasetId = this.datasetId;
        let CIRCLE_RADIUS = 15;
        let router = this.router;
        let userFactory = this.userFactory;


        if (!data) {
            uiService.clean();
            return;
        }
        let slug = data.getSlug();


        uiService.clean();

        let svg: any = d3.select("svg"),
            margin = marginSize,
            diameter = +width

        let g = svg.append("g")
            .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")")
            , transform = d3.zoomIdentity

        let zooming = d3.zoom().on("zoom", zoomed);

        try {
            // the zoom generates an DOM Excpetion Error 9 for Chrome (not tested on other browsers yet)
            svg.call(zooming.transform, d3.zoomIdentity.translate(diameter / 2, diameter / 2));
            svg.call(zooming);
        }
        catch (error) {

        }


        function zoomed() {
            g.attr("transform", d3.event.transform);
        }


        this.zoomSubscription = zoom$.subscribe((zf: number) => {
            try {
                // the zoom generates an DOM Excpetion Error 9 for Chrome (not tested on other browsers yet)
                if (zf) {
                    zooming.scaleBy(svg, zf);
                }
                else {
                    svg.call(zooming.transform, d3.zoomIdentity.translate(diameter / 2, diameter / 2));
                }
            }
            catch (error) {

            }
        })

        fontSize$.subscribe((fs: number) => {
            svg.attr("font-size", fs + "px")
        })

        let pack = d3.pack()
            .size([diameter - margin, diameter - margin])
            .padding(20);

        let root = data;

        root = d3.hierarchy(root)
            .sum(function (d: any) { return 1; }) // all nodes have the same initial size
            .sort(function (a, b) { return b.value - a.value });

        let depth = 0;
        root.eachAfter(function (n: any) {
            depth = (depth > n.depth) ? depth : n.depth;
        })
        let color = colorService.getDefaulColorRange(depth);

        let focus = root,
            nodes = pack(root).descendants(),
            view: any;

        let circle = g.selectAll("circle")
            .data(nodes)
            .remove()
            .enter()
            .append("circle")
            .attr("class", function (d: any) { return d.parent ? (d.children ? "node" : "node node--leaf") : "node node--root"; })
            .style("fill", function (d: any) { return d.children ? (d === root ? "white" : color(d.depth)) : (d.parent === root && !d.children ? color(d.depth) : "white"); })
            .style("stroke", function (d: any) { return d.data.isSearchedFor ? "#d9831f" : "none" })
            .style("stroke-width", function (d: any) { return d.data.isSearchedFor ? 3 : "none" })
            .attr("id", function (d: any) { return "circle" + d.data.id; })
        // .on("click", function (d: any, i: number) {
        //     if (focus !== d) {
        //         zoom(d, i),
        //             d3.selectAll("#title" + d.data.id).style("fill-opacity", 1).style("display", "inline"),
        //             d3.event.stopPropagation();
        //     }
        // });

        let definitions = svg.append("defs")
        let path = definitions.selectAll("path")
            .data(nodes)
            .enter()
            .append("path")
            .attr("id", function (d: any) { return "path" + d.data.id; });

        // console.log(data)
        // console.log(nodes)
        let patterns = definitions.selectAll("pattern")
            .data(nodes)
            .enter()
            .filter(function (d: any) { return d.data.accountable })
            .append("pattern")
            .attr("id", function (d: any) { return "image" + d.data.id; })
            .attr("width", "100%")
            .attr("height", "100%")
            .append("image")
            .attr("width", CIRCLE_RADIUS * 2)
            .attr("height", CIRCLE_RADIUS * 2)
            .attr("xlink:href", function (d: any) {
                // if(d.data.accountable) console.log(d.data.id, d.data.name, d.data.accountable.user_id, d.data.accountable.name, d.data.accountable.picture)
                return d.data.accountable.picture;
            });

        let textGroups = svg.select("g").selectAll("g").data(nodes);

        // enter selection
        let textGroupsEnter = textGroups.enter().append("g");

        // some children, text should be around the circle
        textGroupsEnter
            .append("text")
            .filter(function (d: any) { return d.children && d !== root; })
            .attr("class", "with-children")
            .attr("id", function (d: any) { return "title" + d.data.id; })
            .append("textPath")
            .attr("xlink:href", function (d: any) { return "#path" + d.data.id; })
            .attr("startOffset", function (d: any, i: number) { return "10%"; })
            .on("click", function (d: any, i: number) {
                showTooltip(d, d.parent, d3.event, datasetId);
                d.isTooltipVisible = !d.isTooltipVisible;
            })
            .text(function (d: any) { return d.data.name; })

        textGroupsEnter
            .filter(function (d: any) { return d.children && d !== root; })
            .append("circle")
            .attr("class", "with-children accountable")
            .attr("r", CIRCLE_RADIUS)
            .attr("fill", function (d: any) { return "url(#image" + d.data.id + ")" })
            .attr("xlink:href", function (d: any) { return "#path" + d.data.id; })
            .on("click", function (d: any) {
                if (d.data.accountable) {
                    // HACK : until migration of database towards shortids
                    if (!d.data.accountable.shortid) {
                        userFactory.get(d.data.accountable.user_id)
                            .then(u => d.data.accountable.shortid = u.shortid)
                            .then(() => { router.navigateByUrl(`/summary/map/${datasetId}/${slug}/u/${d.data.accountable.shortid}/${d.data.accountable.getSlug()}`) })
                    }
                    router.navigateByUrl(`/summary/map/${datasetId}/${slug}/u/${d.data.accountable.shortid}/${d.data.accountable.getSlug()}`)
                }

            })

        // no children, the text should be inside the circle
        textGroupsEnter
            .append("text")
            .filter(function (d: any) { return !d.children && d !== root; })
            .attr("class", "without-children")
            .attr("id", function (d: any) { return "title" + d.data.id; })
            .attr("dy", 0)
            .attr("x", function (d: any) { return -d.r * .85 })
            .attr("y", function (d: any) { return -d.r * .2 })
            .text(function (d: any) { return d.data.name; })
            .on("click", function (d: any, i: number) {
                showTooltip(d, d.parent, d3.event, datasetId);
                d.isTooltipVisible = !d.isTooltipVisible;
            })
            .each(function (d: any) {
                uiService.wrap(d3.select(this), d.data.name, d.r * 2 * 0.95);
            })

        textGroupsEnter
            .filter(function (d: any) { return !d.children && d !== root; })
            .append("circle")
            .attr("class", "without-children accountable")
            .attr("r", CIRCLE_RADIUS)
            .attr("cx", function (d: any) { return 0 })
            .attr("cy", function (d: any) { return -d.r * 0.70 })
            .attr("fill", function (d: any) { return "url(#image" + d.data.id + ")" })
            .on("click", function (d: any) {
                if (d.data.accountable) {
                    // HACK : until migration of database towards shortids
                    if (!d.data.accountable.shortid) {
                        userFactory.get(d.data.accountable.user_id)
                            .then(u => d.data.accountable.shortid = u.shortid)
                            .then(() => { router.navigateByUrl(`/summary/map/${datasetId}/${slug}/u/${d.data.accountable.shortid}/${d.data.accountable.getSlug()}`) })
                    }
                    router.navigateByUrl(`/summary/map/${datasetId}/${slug}/u/${d.data.accountable.shortid}/${d.data.accountable.getSlug()}`)
                }

            })

        textGroups
            .select("g").select("text.with-children")
            .data(nodes)

        // exit selection
        textGroups.exit().remove();

        let node = g.selectAll("path,circle,text, image");

        svg
            .style("background", color(-1))
            .on("click", function () { zoom(root, 0); });

        let zoomedNode: HierarchyCircularNode<any> = nodes.find(function (d: any) { return d.data.isZoomedOn === true });
        if (!zoomedNode) {
            zoomedNode = root;
        }
        zoomTo([zoomedNode.x, zoomedNode.y, zoomedNode.r * 2 + margin], parseInt(zoomedNode.id));
        if (zoomedNode !== root)
            d3.selectAll("#title" + parseInt(zoomedNode.data.id)).style("fill-opacity", 1).style("display", "inline");

        function zoom(d: any, index: number) {
            let focus0 = focus; focus = d;

            let transition = d3.transition("move")
                // .duration(d3.event.altKey ? 7500 : 750)
                .duration(750)
                .tween("zoom", function (d) {
                    let i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
                    return function (t) { zoomTo(i(t), index); };
                });

            let updateCounter = 0;

            transition.selectAll("text")
                .filter(function (d: any) { return d.parent === focus || (<any>this).style.display === "inline"; })
                // .style("fill-opacity", function (d: any) { return d.parent === focus || (d === focus && !d.children) ? 1 : (d === focus ? 0.4 : 0); })
                .on("start", function (d: any) { if (d.parent === focus) (<any>this).style.display = "inline"; })
                .each(function (d: any) { updateCounter++ })
                .on("end", function (d: any) {
                    // if (d.parent !== focus) this.style.display = "none";
                    updateCounter--;
                    if (updateCounter === 0) {
                        uiService.adjustLabels(textGroups, (diameter / d.r / 2));
                    }
                })
        }

        function zoomTo(v: any, index: number) {
            let k = diameter / v[2]; view = v;
            node.attr("transform", function (d: any) {
                return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"
            });

            circle.attr("r", function (d: any) { return d.r * k; });

            path.attr("d", function (d: any, i: number) {
                let radius = d.r * k + 3;
                return uiService.getCircularPath(radius, -radius, 0);
            })

            d3.selectAll("circle.with-children")
                .attr("cx", function (d: any) { return Math.cos(Math.PI - Math.PI * 36 / 180) * d.r - 20 })
                .attr("cy", function (d: any) { return - Math.sin(Math.PI - Math.PI * 36 / 180) * d.r + 10 })
        }

        function showTooltip(d: any, parent: any, event: any, datasetId: string) {
            uiService.setTooltipData(datasetId, d.data, parent.data);
        }
    }
}