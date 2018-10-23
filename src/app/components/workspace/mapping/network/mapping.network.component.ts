import { Team } from './../../../../shared/model/team.data';
import { Role } from "./../../../../shared/model/role.data";
import { User } from "./../../../../shared/model/user.data";
import { ColorService } from "./../../../../shared/services/ui/color.service";
import { UIService } from "./../../../../shared/services/ui/ui.service";
import { Router } from "@angular/router";
import { DataService } from "./../../../../shared/services/data.service";
import { URIService } from "./../../../../shared/services/uri.service";
import { Tag, SelectableTag } from "./../../../../shared/model/tag.data";
import { Initiative } from "./../../../../shared/model/initiative.data";
import { Subject, BehaviorSubject } from "rxjs/Rx";
import { Subscription } from "rxjs/Subscription";
import { Observable } from "rxjs/Observable";
import {
  Component,
  OnInit,
  ViewEncapsulation,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from "@angular/core";
import { D3Service, D3, ForceLink, HierarchyNode } from "d3-ng2-service";
import { IDataVisualizer } from "../mapping.interface";
import { Angulartics2Mixpanel } from "angulartics2";
import { compact, flatten, uniqBy, remove, flattenDeep, partition, isEmpty, groupBy, chain } from "lodash";

@Component({
  selector: "network",
  templateUrl: "./mapping.network.component.html",
  styleUrls: ["./mapping.network.component.css"],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MappingNetworkComponent implements OnInit, IDataVisualizer {
  private d3: D3;

  public datasetId: string;
  public width: number;
  public height: number;
  public teamName: string;
  public teamId: string;
  public translateX: number;
  public translateY: number;
  public scale: number;
  public tagsState: Array<SelectableTag>;

  public margin: number;
  public selectableTags$: Observable<Array<SelectableTag>>;
  public zoom$: Observable<number>;
  public fontSize$: Observable<number>;
  public fontColor$: Observable<string>;
  public mapColor$: Observable<string>;
  public zoomInitiative$: Observable<Initiative>;
  // public isLocked$: Observable<boolean>;
  public isReset$: Observable<boolean>;

  public toggleOptions$: Observable<Boolean>;
  public data$: Subject<{ initiative: Initiative; datasetId: string }>;

  public rootNode: Initiative;
  public slug: string;
  public team: Team;


  public _isDisplayOptions: Boolean = false;
  private isAuthorityCentricMode$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public _isAuthorityCentricMode: boolean = true;

  public showContextMenuOf$: Subject<{ initiative: Initiative, x: Number, y: Number }> = new Subject<{ initiative: Initiative, x: Number, y: Number }>();

  public showDetailsOf$: Subject<Initiative> = new Subject<Initiative>();
  // public addInitiative$: Subject<Initiative> = new Subject<Initiative>();
  public removeInitiative$: Subject<Initiative> = new Subject<Initiative>();
  public showToolipOf$: Subject<{ initiatives: Initiative[], isNameOnly: boolean }> = new Subject<{ initiatives: Initiative[], isNameOnly: boolean }>();
  public moveInitiative$: Subject<{
    node: Initiative;
    from: Initiative;
    to: Initiative;
  }> = new Subject<{ node: Initiative; from: Initiative; to: Initiative }>();
  public closeEditingPanel$: Subject<boolean> = new Subject<boolean>();
  public analytics: Angulartics2Mixpanel;

  private zoomSubscription: Subscription;
  private dataSubscription: Subscription;
  private resetSubscription: Subscription;
  private fontSubscription: Subscription;
  public toggleOptionsSubscription: Subscription;

  T: any;
  TRANSITION_DURATION = 250;

  CIRCLE_RADIUS: number = 25;
  LINE_WEIGHT = 4;
  FADED_OPACITY = 0.1;
  private svg: any;
  private g: any;
  // private link: any;
  private fontSize: number;
  public tooltipInitiatives: Array<Initiative>;
  public tooltipRoles: Array<{ initiative: Initiative; role: Role }>;
  public tooltipSourceUser: User;
  public tooltipTargetUser: User;
  public isLoading: boolean;

  constructor(
    public d3Service: D3Service,
    public colorService: ColorService,
    public uiService: UIService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private dataService: DataService,
    private uriService: URIService
  ) {
    this.d3 = d3Service.getD3();
  }

  ngOnInit() {
    this.isLoading = true;
    this.init();
    this.dataSubscription = this.dataService
      .get()
      .combineLatest(this.mapColor$, this.isAuthorityCentricMode$.asObservable())
      .subscribe(complexData => {
        console.log(complexData)
        let data = <any>complexData[0].initiative;
        this.datasetId = complexData[0].dataset.datasetId;
        this.rootNode = complexData[0].initiative;
        this.team = complexData[0].team;
        this.slug = data.getSlug();
        this.update(data, complexData[1], complexData[2]);
        this.analytics.eventTrack("Map", {
          action: "viewing",
          view: "connections",
          team: data.teamName,
          teamId: data.teamId
        });
        this.isLoading = false;
        this.cd.markForCheck();
      });

    this.selectableTags$.subscribe(tags => this.tagsState = tags)

    this.toggleOptionsSubscription = this.toggleOptions$.subscribe(toggled => {
      this._isDisplayOptions = toggled;
      this.cd.markForCheck();
    })
  }

  ngOnDestroy() {
    if (this.zoomSubscription) {
      this.zoomSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.resetSubscription) {
      this.resetSubscription.unsubscribe();
    }
    if (this.fontSubscription) {
      this.fontSubscription.unsubscribe();
    }
    if (this.toggleOptionsSubscription) {
      this.toggleOptionsSubscription.unsubscribe();
    }
  }

  init() {
    this.uiService.clean();

    let d3 = this.d3;

    let svg: any = d3
      .select("svg")
      .attr("width", this.width)
      .attr("height", this.height);
    let g = svg
      .append("g")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr(
        "transform",
        `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`
      );
    g.append("g").attr("class", "links");
    g.append("g").attr("class", "labels");
    g.append("g").attr("class", "nodes");
    g.append("defs");

    svg
      .append("svg:defs")
      .selectAll("marker")
      .data([
        { id: "arrow", opacity: 1 },
        { id: "arrow-fade", opacity: this.FADED_OPACITY },
        { id: "arrow-hover", opacity: 1 }
      ])
      .enter()
      .append("marker")
      .attr("id", (d: any) => d.id)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 19)
      .attr("refY", 0)
      .attr("markerWidth", this.CIRCLE_RADIUS)
      .attr("markerHeight", this.CIRCLE_RADIUS)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5")
      .style("opacity", (d: any) => d.opacity);

    let zooming = d3
      .zoom()
      .scaleExtent([1 / 10, 4])
      .on("zoom", zoomed)
      .on("end", () => {
        let transform = d3.event.transform;
        let tagFragment = this.tagsState
          .filter(t => t.isSelected)
          .map(t => t.shortid)
          .join(",");
        location.hash = this.uriService.buildFragment(
          new Map([
            ["x", transform.x],
            ["y", transform.y],
            ["scale", transform.k],
            ["tags", tagFragment]
          ])
        );
      });

    function zoomed() {
      g.attr("transform", d3.event.transform);
    }

    try {
      // the zoom generates an DOM Excpetion Error 9 for Chrome (not tested on other browsers yet)
      // svg.call(zooming.transform, d3.zoomIdentity.translate(diameter / 2, diameter / 2));
      svg.call(
        zooming.transform,
        d3.zoomIdentity
          .translate(this.translateX, this.translateY)
          .scale(this.scale)
      );
      svg.call(zooming);
    } catch (error) { }

    this.zoomSubscription = this.zoom$.subscribe((zf: number) => {
      try {
        // the zoom generates an DOM Excpetion Error 9 for Chrome (not tested on other browsers yet)
        if (zf) {
          zooming.scaleBy(svg.transition().duration(this.TRANSITION_DURATION), zf);
        } else {
          svg.transition().duration(this.TRANSITION_DURATION).call(
            zooming.transform,
            d3.zoomIdentity.translate(this.translateX, this.translateY)
          );
        }
      } catch (error) { }
    });

    this.resetSubscription = this.isReset$.filter(r => r).subscribe(isReset => {
      svg.transition().duration(this.TRANSITION_DURATION).call(
        zooming.transform,
        d3.zoomIdentity.translate(0, -this.height / 4)
      );
    });

    this.fontSubscription = this.fontSize$
      .combineLatest(this.fontColor$, this.mapColor$)
      .subscribe((format: [number, string, string]) => {
        // font size
        svg.attr("font-size", format[0] + "rem");
        svg.selectAll("text").attr("font-size", format[0] + "rem");
        this.fontSize = format[0];
        // font color
        svg.style("fill", format[1]);
        svg.selectAll("text").style("fill", format[1]);
        svg.selectAll("marker#arrow, marker#arrow-fade").attr("fill", format[2]);
        svg.selectAll("marker#arrow-hover").attr("fill", d3.color(format[2]).darker(2).toString());
      });

    let [clearSearchInitiative, highlightInitiative] = this.zoomInitiative$.partition(node => node === null);
    clearSearchInitiative
      .combineLatest(this.isAuthorityCentricMode$.asObservable())
      .subscribe((zoomed: [Initiative, boolean]) => {
        let node = zoomed[0];
        let isAuthorityCentricMode = zoomed[1]

        g.selectAll("path.edge").style("stroke-opacity", function (d: any) {
          return 1;
        }).style("opacity", function (d: any) {
          return 1;
        })
          .attr("marker-end", function (d: any) {
            if (isAuthorityCentricMode)
              return "url(#arrow)";
          });
      });
    highlightInitiative
      .combineLatest(this.isAuthorityCentricMode$.asObservable())
      .subscribe((zoomed: [Initiative, boolean]) => {

        let node = zoomed[0];
        let isAuthorityCentricMode = zoomed[1]

        g.selectAll("path.edge")
          .style("stroke-opacity", function (d: any) {
            return d[4].includes(node.id) ? 1 : 0
          }).style("opacity", function (d: any) {
            return d[4].includes(node.id) ? 1 : 0
          })
          .attr("marker-end", function (d: any) {
            if (isAuthorityCentricMode)
              return d[4].includes(node.id) ? "url(#arrow)" : "url(#arrow-fade)"
          });

      });

    this.selectableTags$.combineLatest(this.isAuthorityCentricMode$.asObservable()).subscribe(value => {
      let tags = value[0];
      let isAuthorityCentricMode = value[1];

      let [selectedTags, unselectedTags] = partition(tags, t => t.isSelected);
      let uiService = this.uiService
      let FADED_OPACITY = this.FADED_OPACITY
      g.selectAll("path.edge")
        .style("stroke-opacity", function (d: any) {
          return uiService.filter(selectedTags, unselectedTags, d[5]) ? 1 : FADED_OPACITY;
        }).style("opacity", function (d: any) {
          return uiService.filter(selectedTags, unselectedTags, d[5]) ? 1 : FADED_OPACITY;
        })
        .attr("marker-end", function (d: any) {
          if (isAuthorityCentricMode)
            return uiService.filter(selectedTags, unselectedTags, d[5]) ? "url(#arrow)" : "url(#arrow-fade)";
        });
    })

    this.svg = svg;
    this.g = g;
  }

  private prepareAuthorityCentric(initiativeList: HierarchyNode<Initiative>[]) {
    let nodesRaw = initiativeList
      .map(d => {
        let all = flatten([...[d.data.accountable], d.data.helpers]);
        return uniqBy(remove(all), a => {
          return a.user_id;
        });
      })
      .reduce((pre, cur) => {
        return [...pre, ...cur];
      })
      .map(u => {
        return {
          name: u.name,
          id: u.user_id,
          picture: u.picture,
          shortid: u.shortid,
          slug: u.getSlug()
        };
      });

    let rawlinks = initiativeList
      .map(i => {
        return i.data;
      })
      .map(i => {
        return i.helpers.map(h => {
          if (i.accountable && h.user_id !== i.accountable.user_id)
            return {
              source: h.user_id,
              target: i.accountable ? i.accountable.user_id : undefined,
              type: "helps",
              initiative: i.id,
              tags: i.tags
            };
        });
      })
      .reduce((pre, cur) => {
        let reduced = remove([...pre, ...cur]);

        return reduced;
      })
      .map(l => {
        return {
          linkid: `${l.source}-${l.target}`,
          source: l.source,
          target: l.target,
          initiative: l.initiative,
          type: l.type,
          tags: l.tags
        };
      });


    let links = chain(rawlinks).groupBy("linkid")
      .map((items: any, linkid: string) => {
        return {
          source: items[0].source,
          target: items[0].target,
          type: items[0].type,
          weight: items.length,
          initiatives: items.map((item: any) => item.initiative),
          tags: flattenDeep(items.map((item: any) => item.tags)).map(
            (t: Tag) => t.shortid
          )
        };
      })
      .value();

    return {
      nodes: uniqBy(nodesRaw, u => {
        return u.id;
      }),
      links: links
    };
  }

  private prepareHelperCentric(initiativeList: HierarchyNode<Initiative>[]) {
    let nodesRaw = initiativeList
      .map(d => {
        let all = flatten([...[d.data.accountable], d.data.helpers]);
        return uniqBy(remove(all), a => {
          return a.user_id;
        });
      })
      .reduce((pre, cur) => {
        return [...pre, ...cur];
      })
      .map(u => {
        return {
          name: u.name,
          id: u.user_id,
          picture: u.picture,
          shortid: u.shortid,
          slug: u.getSlug()
        };
      });

    let rawlinks = initiativeList
      .map(i => {
        return i.data;
      })
      .map(i => {
        let allWorkers = remove(flatten([...[i.accountable], i.helpers]))

        let result: any[] = []
        allWorkers.forEach((w, ix, arr) => {
          arr.forEach(o => {
            if (o.user_id !== w.user_id) {
              result.push({
                source: w.user_id,
                target: o.user_id,
                type: "works with",
                initiative: i.id,
                tags: i.tags
              })
            }
          })
        })
        return result;
      })
      .reduce((pre, cur) => {
        let reduced = remove([...pre, ...cur]);

        return reduced;
      })
      .map(l => {
        return {
          linkid: l.source < l.target ? `${l.source}-${l.target}` : `${l.target}-${l.source}`,
          source: l.source,
          target: l.target,
          initiative: l.initiative,
          type: l.type,
          tags: l.tags
        };
      });

    let links = chain(rawlinks).groupBy("linkid")
      .map((items: any, linkid: string) => {
        let uniqueItems = uniqBy(items, (i: any) => i.initiative);
        // console.log(items, uniqueItems)
        return {
          source: uniqueItems[0].source,
          target: uniqueItems[0].target,
          type: uniqueItems[0].type,
          weight: uniqueItems.length,
          initiatives: uniqueItems.map((item: any) => item.initiative),
          tags: flattenDeep(uniqueItems.map((item: any) => item.tags)).map(
            (t: Tag) => t.shortid
          )
        };
      })
      .value();

    return {
      nodes: uniqBy(nodesRaw, u => {
        return u.id;
      }),
      links: links
    };
  }

  getTags() {
    return this.tagsState;
  }


  public switch() {
    this._isAuthorityCentricMode = !this._isAuthorityCentricMode;
    this.isAuthorityCentricMode$.next(this._isAuthorityCentricMode);
  }

  public update(data: any, seedColor: string, isAuthorityCentricMode: boolean) {
    if (this.d3.selectAll("g").empty()) {
      this.init();
    }

    let d3 = this.d3;
    let g = this.g;
    let fontSize = this.fontSize;
    let width = this.width;
    let height = this.height;
    let bilinks: Array<any> = [];
    let uiService = this.uiService;
    let showDetailsOf$ = this.showDetailsOf$;
    let showToolipOf$ = this.showToolipOf$;
    let datasetSlug = this.slug;
    let datasetId = this.datasetId;
    let getTags = this.getTags.bind(this);
    let CIRCLE_RADIUS = this.CIRCLE_RADIUS;
    let LINE_WEIGHT = this.LINE_WEIGHT;
    let FADED_OPACITY = this.FADED_OPACITY;

    let initiativesList: HierarchyNode<Initiative>[] = this.d3
      .hierarchy(data)
      .descendants();


    let graph = isAuthorityCentricMode ? this.prepareAuthorityCentric(initiativesList) : this.prepareHelperCentric(initiativesList);

    let router = this.router;
    let slug = this.slug;

    let simulation = d3
      .forceSimulation()
      .force(
        "link",
        d3.forceLink().id(function (d: any) {
          return d.id;
        })
      )
      .force(
        "charge",
        d3
          .forceManyBody()
          .distanceMax(400)
          .strength(function (d) {
            return -600;
          })
      )
      .force("center", d3.forceCenter(width / 2, height / 2));

    let patterns = g
      .select("defs")
      .selectAll("pattern")
      .data(graph.nodes);
    patterns
      .enter()
      .append("pattern")
      .merge(patterns)
      .attr("id", function (d: any) {
        return "image" + d.id;
      })
      .attr("width", "100%")
      .attr("height", "100%")
      .append("image")
      .attr("width", CIRCLE_RADIUS * 2)
      .attr("height", CIRCLE_RADIUS * 2)
      .attr("xlink:href", function (d: any) {
        return d.picture;
      });

    let nodes = graph.nodes,
      nodeById = d3.map(nodes, function (d: any) {
        return d.id;
      }),
      links = graph.links;

    let [selectedTags, unselectedTags] = partition(getTags(), (t: SelectableTag) => t.isSelected);
    // console.log(selectedTags, unselectedTags)

    links.forEach(function (link: {
      source: string;
      target: string;
      weight: number;
      type: string;
      initiatives: Array<string>;
      tags: Array<string>;
    }) {
      let s = (link.source = <any>nodeById.get(link.source)),
        t = (link.target = <any>nodeById.get(link.target)),
        i = {},
        weight = link.weight,
        initiatives = link.initiatives,
        tags = link.tags,
        id = `${s.id}-${t.id}`,
        type = link.type; // intermediate node

      nodes.push(<any>i);
      links.push(<any>{ source: s, target: i }, <any>{ source: i, target: t });
      bilinks.push([s, i, t, weight, initiatives, tags, id, type]);
    });

    let link = g
      .select("g.links")
      .selectAll("path.edge")
      .data(bilinks, function (d: any) {
        return d[5];
      });
    link.exit().remove();

    link = link
      .enter()
      .append("path")
      .attr("class", "edge")
      .merge(link)
      // .attr("stroke", seedColor)
      .attr("data-initiatives", function (d: any) {
        return d[4].join(" ");
      })
      .attr("data-tags", function (d: any) {
        return d[5].join(",");
      })
      .attr("data-source", function (d: any) {
        return d[0].id;
      })
      .attr("data-target", function (d: any) {
        return d[2].id;
      })
      .attr("stroke-width", function (d: any) {
        return `${LINE_WEIGHT * d[3]}px`;
      })
      .style("opacity", function (d: any) {
        return uiService.filter(selectedTags, unselectedTags, d[5]) ? 1 : FADED_OPACITY;
      })
      .style("stroke-opacity", function (d: any) {
        return uiService.filter(selectedTags, unselectedTags, d[5]) ? 1 : FADED_OPACITY;
      })
      .attr("id", function (d: any) {
        return d[6];
      })
      .attr("marker-end", function (d: any) {
        if (isAuthorityCentricMode)
          return uiService.filter(selectedTags, unselectedTags, d[5]) ? "url(#arrow)" : "url(#arrow-fade)";
      });
    // .attr("marker-end", "url(#arrow)");

    let label = g
      .select("g.labels")
      .selectAll("text.edge")
      .data(bilinks, function (d: any) {
        return d[5];
      });
    label.exit().remove();

    label = label
      .enter()
      .append("text")
      .attr("class", "edge")
      .merge(label)
      .attr("font-size", `${fontSize * 0.8}px`)
      .style("display", "none")
      .html(function (d: any) {
        let source = d[0];
        let target = d[2];

        let filtered = initiativesList
          .filter((i: any) => d[4].includes(i.data.id))
          .map(i => i.data);

        if (filtered.length > 0) {
          let h = filtered
            .map(
              (i, ix) =>
                `<tspan class="is-helping" x="0" y="0" dy="${ix + 1}rem">${
                i.name
                }</tspan>`
            )
            .join("");

          return (
            `<tspan  x="0" y="0" class="is-helping-title" dy="0rem">${
            source.name
            } helps ${target.name} with</tspan>` + h
          );
        }
      });

    d3.selectAll(`.open-initiative`).on("click", function (d: any) {
      let id = Number.parseFloat(d3.select(this).attr("id"));
      showDetailsOf$.next(initiativesList.find(n => (<any>n.data).id === id).data);
    });
    d3.selectAll(`.open-summary`).on("click", function (d: any) {
      let shortid = d3.select(this).attr("data-shortid");
      let slug = d3.select(this).attr("data-slug");
      router.navigateByUrl(
        `/map/${datasetId}/${datasetSlug}/u/${shortid}/${slug}`
      );
    });

    let node = g
      .select("g.nodes")
      .selectAll("g.node")
      .data(
        nodes.filter(function (d) {
          return d.id;
        })
      );
    node.exit().remove();

    node = node
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("id", (d: any) => d.id)
      .merge(node)
      .on("dblclick", releaseNode)
      .call(
        d3
          .drag<SVGElement, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    node.append("circle");
    node.append("text").attr("class", "authority-name");

    node
      .select("circle")
      .attr("r", CIRCLE_RADIUS)
      .attr("fill", function (d: any) {
        return "url(#image" + d.id + ")";
      })
      .attr("pointer-events", "auto")
      .attr("cursor", "move");

    node
      .select("text.authority-name")
      .attr("pointer-events", "auto")
      .attr("cursor", "pointer")
      // .style("font-weight", "initial")
      .attr("dx", CIRCLE_RADIUS + 3)
      .attr("dy", CIRCLE_RADIUS / 2)
      .on("click", function (d: any) {
        router.navigateByUrl(
          `/map/${datasetId}/${slug}/u/${d.shortid}/${d.slug}`
        );
      })
      .text(function (d: any) {
        return d.name;
      });

    g.selectAll("path")
      .style("stroke-opacity", 1)
      .style("stroke", seedColor)
      .on("mouseover", function (d: any) {
        // console.log(d)
        d3.event.stopPropagation();

        let path = d3.select(this);
        path
          .style("stroke-opacity", 1)
          .style("stroke", d3.color(seedColor).darker(2).toString())
          .attr("marker-end", function (d: any) {
            if (isAuthorityCentricMode)
              return "url(#arrow-hover)";
          });


        let p = path
          .node()
          .getPointAtLength(0.5 * path.node().getTotalLength());

        let ids: any[] = d[4];

        let list = initiativesList.map(i => i.data).filter(i => {
          return ids.includes(i.id)
        });

        showToolipOf$.next({initiatives : list, isNameOnly:true})
      })
      .on("mouseout", function (d: any) {

        let path = d3.select(this);
        path
          .style("stroke-opacity", 1)
          .style("stroke", seedColor)
          .attr("marker-end", function (d: any) {
            if (isAuthorityCentricMode)
              return "url(#arrow)";
          });
        showToolipOf$.next({initiatives : null, isNameOnly:true})
        /*
                let tooltip = d3.select(`div.arrow_box[id="${d[6]}"]`);
                tooltip.classed("show", false);
                */
      });


    simulation.nodes(graph.nodes).on("tick", ticked);

    simulation.force<ForceLink<any, any>>("link").links(graph.links);

    function ticked() {
      link.attr("d", positionLink);
      node.attr("transform", positionNode);
      label.attr("transform", positionLabel);
    }

    function positionLabel(d: any) {
      let path = g.select("defs").select(`path[id="path${d[5]}"]`);
      if (path.node()) {
        let p = path
          .node()
          .getPointAtLength(0.6 * path.node().getTotalLength());
        return "translate(" + p.x + "," + p.y + ")";
      } else {
        return "translate(" + 0 + "," + 0 + ")";
      }
    }

    function positionLink(d: any) {
      return (
        "M" +
        d[0].x +
        "," +
        d[0].y +
        "S" +
        d[1].x +
        "," +
        d[1].y +
        " " +
        d[2].x +
        "," +
        d[2].y
      );
    }

    function positionNode(d: any) {
      return "translate(" + d.x + "," + d.y + ")";
    }

    function dragstarted(d: any) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d3.select(this).classed("fixed", (d.fixed = true));
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d: any) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d: any) {
      if (!d3.event.active) simulation.alphaTarget(0);
      // d.fx = null;
      // d.fy = null;
    }

    function releaseNode(d: any) {
      d3.select(this).classed("fixed", (d.fixed = false));
      d.fx = null;
      d.fy = null;
      d3.event.stopPropagation();
    }

  }
}
