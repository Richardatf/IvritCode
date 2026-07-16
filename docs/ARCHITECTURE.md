# Architecture

The npm workspace separates Unicode, core execution, analysis, lexicon, CLI, web, and serverless boundaries. Dependencies point inward: applications depend on packages; packages do not depend on applications. Archived prototypes are excluded from lint, compilation, tests, and production bundles.
