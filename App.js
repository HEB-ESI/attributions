// the following is only for the tagged template string below (html`...`)
const html = (strings, ...values) => String.raw({ raw: strings }, ...values);

const removeDiacritics = 
    (str) => str.normalize("NFD").replace(/\p{Diacritic}/gu, "")
const hasNoDiacritics = (str) => removeDiacritics(str) == str

export default {
    template: html`

        <h1>Attributions HE2B-ESI au {{ lastCommitDate }}</h1>

        <div>
            <input v-model="query" ref="input" placeholder="Rechercher ...">
        </div>

        <button @click="e => exportTableToCSV('tableau')">
        Exporter le résultat en CSV
        </button>
        
        <p>
            {{ vdatas.length }} résultat{{ vdatas.length > 1 ? "s" : ""}}
            <span class="error" v-if="error">({{ error }})</span>
        </p>
        <div style="overflow-x:auto;">
            <table id="myTable">
                <tr>
                    <th class="w50" @click="sortBy(0)">
                        {{ headers[0] }} {{ sortedSymbol(0) }}
                    </th>
                    <th class="w20" @click="sortBy(1)">
                        {{ headers[1] }} {{ sortedSymbol(1) }}
                    </th>
                    <th class="w15" @click="sortBy(2)">
                        {{ headers[2] }} {{ sortedSymbol(2) }}
                    </th>
                    <th class="w15" @click="sortBy(3)">
                        {{ headers[3] }} {{ sortedSymbol(3) }}
                    </th>
                </tr>
                <tbody>
                    <tr v-for="data in vdatas" :key="data" :class="{ mission: data[4] }">
                        <td>{{ data[0] }}</td>
                        <td>{{ data[1] }}</td>
                        <td>{{ data[2] }}</td>
                        <td>{{ data[3] }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
    data() {
        return {
            headers: ["Quoi ?", "Pour ?", "Qui ?", "Quand ?", null], // null means "do not show/export"
            datas: [],
            query: "",
	    error: null,
	    sortIndex: undefined,
	    sortAscending: undefined,
        lastCommitDate: undefined
        }
    },
    mounted() {
        this.initialize();
    },
    methods: {
        sortBy(colIndex) {
            if (this.sortIndex === colIndex) {
                this.sortAscending = ! this.sortAscending
            } else {
                this.sortAscending = true
                this.sortIndex = colIndex
            }
            this.datas = _.orderBy(this.datas, 
                v => v[this.sortIndex], 
                this.sortAscending ? 'asc' : 'desc')
        },
        exportTableToCSV(filename) {
            // Créer un lien de téléchargement et le télécharger
            const csvContent = "data:text/csv;charset=utf-8,"
                + [this.headers, ...this.vdatas]
                    .map(l => l
                        .filter((val, index) => this.headers[index] != null) // filter columns not intended for export
                        .join(","))
                    .join("\n");

            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", filename + ".csv");
            link.click();
        },
        addData(fileName, isMission) {
            fetch(fileName)
                .then(response => response.text())
                .then(content => content.replace(/\r\n/, "\n"))
                .then(contents => {
                    const lines = contents.split('\n');
                    let newdata = lines
                        .filter(l => !l.match(/---/)) // remove line separators (thank you, MS Access)
                        .filter(l => !l.match('ahcLibelle')) // remove line headers
                        .filter(l => !l.match('acActivite'))
                        .filter(l => !!l) // remove final empty line
                        .map((line) =>
                            [
                                ...line
                                    .split('|')
                                    .map(s => s.trim())
                                    .slice(1, 5),
                                isMission
                            ]);
                    this.datas = [...this.datas, ...newdata];
                })
                .catch(error => {
                    console.error('Une erreur s\'est produite lors de la récupération du fichier :', error);
                });
        },
        initialize() {
            this.addData('https://raw.githubusercontent.com/HEB-ESI/attributions/refs/heads/main/Cours.txt', false)
            this.addData('https://raw.githubusercontent.com/HEB-ESI/attributions/refs/heads/main/Missions.txt', true)
            fetch("https://api.github.com/repos/HEB-ESI/attributions/commits/HEAD")
                .then(r => r.json())
                .then(data => new Date(data.commit.author.date))
                .then(date => this.lastCommitDate = date.toLocaleDateString("fr-BE", {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }))
            this.$refs.input.focus();
        },
        sortedSymbol(colIndex) {
            if (colIndex === this.sortIndex) {
            return this.sortAscending ? "▲" : "▼"
            }
        }
    },
    computed: {
        pattern() {
            try {
		this.error = ""
                return new RegExp(this.query, 'i');
            } catch (error) {
                console.error('error :', error);
		this.error = "Expression régulière invalide"
                return new RegExp('a^');
            };
        },
        vdatas() {
            const shouldRemoveDiacritics = hasNoDiacritics(this.query)
            return this.datas.filter((item) => {
                return this.pattern.test(shouldRemoveDiacritics ? removeDiacritics(item + "") : item);
            });
        }
    }
}
