# Handoff

Iteration 47.

## Changed

drop-in/ is new. Ten packages.

## Did not change

The kernel. The acceptance script.

## Packages

| Folder | Module | Target |
|---|---|---|
| drop-in/cad | cadClip | Intersection tessellation |
| drop-in/cfd | cfdStep | Residual that converges |
| drop-in/circuit | circuitStep | Transient that matches a known circuit |
| drop-in/simulation | simStep | Multi-body with contact |
| drop-in/hil | hilStep | A device on a bus |
| drop-in/fabrication | fabricate | A toolpath and a measured part |
| drop-in/manufacturing | route | Capacity and a quality hold |
| drop-in/prototyping | prototype | A revision with evidence |
| drop-in/logistics | supply | A shortage that holds an order |
| drop-in/emulation | emulate | A result that matches the device |

## How to iterate

Give one folder to another AI. It improves module.js. It keeps the HOLD behavior. It adds a test. It returns a zip named after the folder. Drop the zip into drop-in/.

## Do not touch

Do not flatten the kernel. Do not exclude a requirement. Do not name another organization. Do not claim a depth that is not there.
