/**
 * Types describing the Benin admin-level-1 (départements) GeoJSON shipped
 * with the project (sourced from geoBoundaries gbOpen, public domain).
 */

import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson";

export interface BeninDepartmentProps {
  shapeName: string;
  shapeISO: string;
  shapeID: string;
  shapeGroup: "BEN";
  shapeType: "ADM1";
}

export type BeninDepartmentFeature = Feature<
  Polygon | MultiPolygon,
  BeninDepartmentProps
>;

export type BeninDepartmentsCollection = FeatureCollection<
  Polygon | MultiPolygon,
  BeninDepartmentProps
>;

/** Mocked density per department: number of online drivers for the demo. */
export interface DepartmentStats {
  online: number;
  available: number;
  busy: number;
}
