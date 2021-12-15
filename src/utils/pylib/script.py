
entityNames = []
propertiesNames = []

toLowerCase = {}
numberishVariables = {}

currentEntity = ''

lines = [x.strip() for x in open('schema.graphql', 'r').readlines()]
for line in lines:
    if '#' in line:
        continue

    if ':' in line:
        name = line.split(':')[0]
        kind = line.split(':')[1].strip()
        if kind[-1] == '!':
            kind = kind[:-1]
        if name not in propertiesNames:
            propertiesNames.append(name)
        if kind in ['BigInt', 'BigDecimal']:
            numberishVariables[currentEntity].append(name)

    if line.find('@entity') != -1:
        name = line.split(' ')[1]
        entityNames.append(name)
        currentEntity = name
        numberishVariables[name] = []
        toLowerCase[name] = name[0].lower() + name[1:] + 's'


nameFile = open('consts.ts', 'w')
nameFile.write('export const entitiesName = {\n')

for entity in entityNames:
    queryName = entity[:1].lower() + entity[1:] + 's'
    nameFile.write(f'\t{entity}: \"{queryName}\",' + '\n')
nameFile.write('};\n\n')

nameFile.write('export const propertiesName = {\n')

for property in propertiesNames:
    queryName = property
    nameFile.write(f'\t{property}: \"{queryName}\",' + '\n')


nameFile.write('};\n')
nameFile.write('''
export const sorting = {
  ascending: "asc",
  increasing: "asc",
  decreasing: "desc",
  descending: "desc",
};
''')


# gen scripts for post processing
postProcessing = open('types.ts', 'w')
postProcessing.write('import BigNumber from "bignumber.js";\n')
postProcessing.write('import { propertiesName } from "../utils/consts";\n\n')

for entity in numberishVariables:
    postProcessing.write(f'function {toLowerCase[entity]}(data: any): any' + ' {\n')

    for variable in numberishVariables[entity]:
        postProcessing.write(f'\tif (propertiesName.{variable} in data) ' + '{\n')
        postProcessing.write(f'\t\t data[propertiesName.{variable}] = new BigNumber(data[propertiesName.{variable}]);\n')
        postProcessing.write('\t}\n')
    postProcessing.write('\treturn data;\n}\n\n')

postProcessing.write('export function postProcessingEntity(entity: string, data: any) {\n')
postProcessing.write('\tswitch(entity) {\n')
for entity in numberishVariables:
    postProcessing.write(f'\t\tcase \"{toLowerCase[entity]}\":\n')
    postProcessing.write(f'\t\t\treturn {toLowerCase[entity]}(data);\n')
postProcessing.write('\t}\n')
postProcessing.write('}\n')
