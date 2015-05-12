build:
	cp ../src/logappend.js logappend
	echo '#!/usr/bin/env node' | cat - logappend > temp && mv temp logappend
	chmod +x logappend
	cp ../src/logread.js logread
	echo '#!/usr/bin/env node' | cat - logread > temp && mv temp logread
	chmod +x logread
	cp -r ../src/lib .

.PHONY: x