<!-- Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary. -->
# Third-party backend licensing and distribution boundary

This package contains adapter code only. It does not bundle third-party simulator source, binaries, model cards, PDK files or manuals.

| Project | Intended role | Upstream licensing note | Included here? |
|---|---|---|---|
| ngspice | SPICE execution backend | Base source is Modified BSD; individual files have exceptions. Inspect the exact installed distribution's `COPYING` before redistribution. | No source/binary |
| Xyce | Scalable SPICE execution backend | Sandia states Xyce source is GNU GPLv3. | No source/binary |
| OpenModelica / OMSimulator | Future equation-based multiphysics / FMI adapter | OSMC Public License with AGPLv3 or specified member-license modes. | No source/binary |
| Qucs-S | Future workbench/backend candidate | Separate project licensing must be reviewed before any distribution. | Not integrated |

The platform's own package license remains as declared by the repository. Invoking a separately installed executable through a process boundary does not copy its implementation into this package, but distribution, service deployment, model-library licensing, and any future linked/shared-library integration still require a per-version legal review. This document is engineering guidance, not legal advice.

Upstream references:
- ngspice licensing: https://ngspice.sourceforge.io/devel.html and https://github.com/ngspice/ngspice/blob/master/COPYING
- Xyce downloads/licensing: https://xyce.sandia.gov/downloads/
- OMSimulator license: https://github.com/OpenModelica/OMSimulator/blob/master/OSMC-License.txt
