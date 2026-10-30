# Semantic independence

MRD 2. Semantics are independent of implementation. This is an effort in every cycle, not a one-time claim.

## The rule

The canonical graph is the semantics. A view, a simulator, an AI provider, a language text, and a file format are implementations. Replacing one must not change the graph.

## This cycle

SIR is a language. The text parses to entities and relations. The same graph can be produced by the workbench, by an import, or by another language. The text is replaceable. The graph is not.

## Every cycle

Before a row is marked PASS, ask: can this be replaced without changing the graph? If the answer is no, the row stays PARTIAL.
