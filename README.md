# Dynamic BVH

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
intersectRay  <br>
frustumCulling  <br>
closestPointToPoint  <br>
intersectsBox <br>
intersectsSphere <br>


## TODO:

traverseByScore  <br>
intersectsRayFirst  <br>
intersectsBVH  <br>
closestPointToGeometry  <br>
getAllCollision  <br>
checkNodeCollision  <br>


experiment rotation with N leaves and max depth  <br>

## References

- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)
- [ErinCatto_DynamicBVH](https://box2d.org/files/ErinCatto_DynamicBVH_Full.pdf)
