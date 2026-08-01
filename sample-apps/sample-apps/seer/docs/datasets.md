# Bundled datasets

Seer packages fixed CSV snapshots. It never downloads a dataset while serving
an MCP request. Run `npm run sync:classic-datasets` only when deliberately
refreshing a documented source snapshot, then review the CSV diff and update
this file's checksums.

| Dataset | Source and license | Packaged target | Deliberate preparation |
| --- | --- | --- | --- |
| Iris | [UCI Iris](https://archive.ics.uci.edu/dataset/53/iris), CC BY 4.0, Fisher (1936), DOI: 10.24432/C56C76 | `species` | Renamed the four measurement headers; normalised species values to `setosa`, `versicolor`, and `virginica`. |
| Wine | [UCI Wine](https://archive.ics.uci.edu/dataset/109/winedataset), CC BY 4.0, Aeberhard & Forina (1992), DOI: 10.24432/C5PC7J | `cultivar` | Added descriptive headers to the 13 source measurements; retained all rows. |
| Auto MPG | [UCI Auto MPG](https://archive.ics.uci.edu/dataset/9/auto-mpg), CC BY 4.0, Quinlan (1993), DOI: 10.24432/C5859H | `mpg` | Excluded identifier-like `car_name`; converted origin codes to region labels; preserved missing horsepower values. |
| Titanic | [OpenML Titanic 40945](https://www.openml.org/d/40945), [CC0 snapshot](https://gitlab.com/data/d/openml/40945) | `survived` | Retained only passenger class, sex, age, family counts, fare, embarkation port, and survival. Excluded names, ticket/cabin identifiers, home destination, and outcome-leaking boat/body columns. |

The snapshots are for teaching transparent supervised learning. Titanic results
describe historical associations in this limited data, not causes or a
judgment about any individual.

## Snapshot checksums

After a dataset refresh, calculate and record checksums with:

```bash
sha256sum src/data/iris.csv src/data/wine.csv src/data/auto-mpg.csv src/data/titanic.csv
```

Current snapshots:

```text
3c3d1995815c9d9c37c2b4c5a7f189b0dd204228fa4f6f3b935d5c12a273a431  iris.csv
d17385d88baceddf0066cc4bae6ef5b3355403ef2461d543f8ad111d04bd775b  wine.csv
a5098d53e85b503aabdf4078a66cd7769c422d57a4b595cbe372b38f06848947  auto-mpg.csv
34f29c94afe32d4a4e3e43b752e2c5359e774a0e34f033b84d04678e37b7bafc  titanic.csv
```
