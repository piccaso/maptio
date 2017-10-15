import { UserFactory } from "./../../shared/services/user.factory";
import { MappingNetworkComponent } from "./network/mapping.network.component";
import { RouterTestingModule } from "@angular/router/testing";
import { Angulartics2Mixpanel, Angulartics2 } from "angulartics2";
import { Initiative } from "./../../shared/model/initiative.data";
import { ActivatedRoute, Params, Router, NavigationStart } from "@angular/router";
import { TooltipComponent } from "./tooltip/tooltip.component";
import { UIService } from "./../..//shared/services/ui/ui.service";
import { ColorService } from "./../..//shared/services/ui/color.service";
import { D3Service } from "d3-ng2-service";
import { AnchorDirective } from "./../..//shared/directives/anchor.directive";
import { Observable } from "rxjs/Observable";
import { ErrorService } from "./../..//shared/services/error/error.service";
import { MockBackend } from "@angular/http/testing";
import { Http, BaseRequestOptions } from "@angular/http";
import { DataService } from "./../..//shared/services/data.service";
import { MappingTreeComponent } from "./tree/mapping.tree.component";
import { MappingCirclesComponent } from "./circles/mapping.circles.component";
import { ComponentFixture, TestBed, async } from "@angular/core/testing";
import { MappingComponent } from "./mapping.component";
import { Views } from "../../shared/model/view.enum";
import { ComponentFactoryResolver, ComponentFactory, ComponentRef, Type, NO_ERRORS_SCHEMA } from "@angular/core";

describe("mapping.component.ts", () => {

    let component: MappingComponent;
    let target: ComponentFixture<MappingComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            providers: [
                DataService, ErrorService, D3Service, ColorService, UIService, Angulartics2Mixpanel, Angulartics2,
                {
                    provide: Http,
                    useFactory: (mockBackend: MockBackend, options: BaseRequestOptions) => {
                        return new Http(mockBackend, options);
                    },
                    deps: [MockBackend, BaseRequestOptions]
                },
                MockBackend,
                BaseRequestOptions,
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: Observable.of({ mapid: 123, layout: "initiatives" })
                    }
                }

            ],
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [MappingComponent, MappingCirclesComponent, MappingTreeComponent, MappingNetworkComponent, TooltipComponent, AnchorDirective],
            imports: [RouterTestingModule]
        })
            .compileComponents()

    }));

    beforeEach(() => {
        target = TestBed.createComponent(MappingComponent);
        component = target.componentInstance;

        target.detectChanges(); // trigger initial data binding
    });

    describe("Controller", () => {


        xdescribe("ngOnInit", () => {
            it("should subscribe to data service and show data with default view", () => {
                let mockRoute = target.debugElement.injector.get(ActivatedRoute);
                let mockDataService = target.debugElement.injector.get(DataService);
                let spyDataService = spyOn(mockDataService, "get").and.returnValue(Observable.of({ name: "some data" }));
                let spyShow = spyOn(component, "show");
                // mockRoute.params = Observable.of({ mapid: 123, layout: "initiatives" })

                component.ngOnInit();
                expect(spyDataService).toHaveBeenCalled();
                expect(spyShow).toHaveBeenCalled();
            })

        });

        describe("zoomIn", () => {
            it("should set the zoom factor to 1.1", async(() => {
                let spy = spyOn(component.zoom$, "next");
                component.zoomIn();
                expect(spy).toHaveBeenCalledWith(1.1)
            }));
        });

        describe("zoomOut", () => {
            it("should set the zoom factor to 1.1", async(() => {
                let spy = spyOn(component.zoom$, "next");
                component.zoomOut();
                expect(spy).toHaveBeenCalledWith(0.9)
            }));
        });

        describe("resetZoom", () => {
            it("should set the zoom factor to 1.1", async(() => {
                let spy = spyOn(component.zoom$, "next");
                component.resetZoom();
                expect(spy).toHaveBeenCalledWith(null)
            }));
        });

        describe("show", () => {
            it("should instanciate MappingCirclesComponent when layout is 'initiatives'", () => {
                // component.data = { initiative: new Initiative({}), datasetId: "some_id" }
                let mockD3Service = target.debugElement.injector.get(D3Service);
                let mockColorService = target.debugElement.injector.get(ColorService);
                let mockUIService = target.debugElement.injector.get(UIService);
                let mockRouter = jasmine.createSpyObj<Router>("router", [""]);
                let mockUserFactory = jasmine.createSpyObj<UserFactory>("userFactory", [""])

                let mockResolver = target.debugElement.injector.get(ComponentFactoryResolver);
                let mockFactory = jasmine.createSpyObj<ComponentFactory<MappingCirclesComponent>>("factory", [""]);
                let mockComponent = jasmine.createSpyObj<ComponentRef<MappingCirclesComponent>>("component", [""]);
                let mockInstance = new MappingCirclesComponent(mockD3Service, mockColorService, mockUIService, mockRouter, mockUserFactory);
                let spyGetInstance = spyOn(component, "getInstance").and.returnValue(mockInstance)
                let spyDraw = spyOn(mockInstance, "draw");
                let spyCreateComponent = spyOn(component.anchorComponent, "createComponent").and.returnValue(mockComponent);

                component.componentFactory = mockFactory;
                component.show({ initiative: new Initiative({}), datasetId: "some_id" });
                expect(spyCreateComponent).toHaveBeenCalledWith(mockFactory);
                expect(spyDraw).toHaveBeenCalled();
                expect(spyGetInstance).toHaveBeenCalled();
            });

            it("should instanciate MappingTreeComponent when layout is 'people'", () => {
                // component.data = { initiative: new Initiative({}), datasetId: "some_id" }
                let mockD3Service = target.debugElement.injector.get(D3Service);
                let mockColorService = target.debugElement.injector.get(ColorService);
                let mockUIService = target.debugElement.injector.get(UIService);
                let mockRouter = jasmine.createSpyObj<Router>("router", [""]);
                let mockUserFactory = jasmine.createSpyObj<UserFactory>("userFactory", [""])

                let mockResolver = target.debugElement.injector.get(ComponentFactoryResolver);
                let mockFactory = jasmine.createSpyObj<ComponentFactory<MappingTreeComponent>>("factory", [""]);
                let mockComponent = jasmine.createSpyObj<ComponentRef<MappingTreeComponent>>("component", [""]);
                let mockInstance = new MappingCirclesComponent(mockD3Service, mockColorService, mockUIService, mockRouter, mockUserFactory);
                let spyGetInstance = spyOn(component, "getInstance").and.returnValue(mockInstance)
                let spyDraw = spyOn(mockInstance, "draw");
                let spyCreateComponent = spyOn(component.anchorComponent, "createComponent").and.returnValue(mockComponent);

                component.componentFactory = mockFactory;
                component.show({ initiative: new Initiative({}), datasetId: "some_id" });
                expect(spyCreateComponent).toHaveBeenCalledWith(mockFactory);
                expect(spyDraw).toHaveBeenCalled();
                expect(spyGetInstance).toHaveBeenCalled()
            });
        });
    });
});