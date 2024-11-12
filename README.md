<div align="center">
  
  <h1>BVH.js</h1>

  <!-- <img src="public/banner.png" alt="bvh-banner" /> <br /> -->

  [![npm](https://img.shields.io/npm/v/bvh.js)](https://www.npmjs.com/package/bvh.js)
  [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=agargaro_BVH.js&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=agargaro_BVH.js)
  [![DeepScan grade](https://deepscan.io/api/teams/21196/projects/27907/branches/893517/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=21196&pid=27907&bid=893517)
  [![Stars](https://badgen.net/github/stars/agargaro/bvh.js)](https://github.com/agargaro/bvh.js)
  [![BundlePhobia](https://badgen.net/bundlephobia/min/bvh.js)](https://bundlephobia.com/package/bvh.js)

</div>

Work in progress... will be released soon :)

Live example: https://stackblitz.com/edit/three-ezinstancedmesh2-dynamic-bvh?file=index.ts

Create a BVH from a AABB array. You can set whetever value to each node.

Build method: top-down or insertion one by one.

## Implemented API:

createFromArray <br>
insert  <br>
insertRange  <br>
move  <br>
delete  <br>
clear  <br>

traverse  <br>
rayIntersections  <br>
frustumCulling  <br>
frustumCullingLOD  <br>
closestPointToPoint  <br>
intersectsBox <br>
intersectsSphere <br>
intersectsRay <br>
isNodeIntersected <br>

## TODO:

traverseByScore  <br>
intersectsRayFirst  <br>
intersectsBVH  <br>
closestPointToBVH  <br>
getAllCollision  <br>
getNearestObject <br>

experiment rotation with N leaves and max depth  <br>

## References

- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)
- [ErinCatto_DynamicBVH](https://box2d.org/files/ErinCatto_DynamicBVH_Full.pdf)
