default: test

test: build
	@find dist_tests -type f -name "*.json"| while read x; do echo -n "$$x: "; make -s clean; ./check_test.py --prefix ./build/ --test $$x|tail -n1; done
	@eval make -s clean

build:
	@eval make -s -C build

clean:
	@rm -f batch AHQWELAB BAHTCMLN BKJVFPRF EDVMRVJV EFGKIXOA EJEVZOYQ HHFNPRAJ HXVRIRTR IXCXRKCE LOFGBVMC LOZUQIXZ OIGUORUO OUTXLQJP PIMJOOVL PJHBNMKK RIHTEKRM RSRYYXDZ RWQJHFBO SDLVGVOA SNZEPOTM TCBZXYQX TEVXVSSW TPWMVDMZ WYMQWRAQ XTVPDSWR XXVEXDDR YNYCUJZE YORHWDWE YPEMUGBB ZNJZSMEQ

.PHONY: test clean clean_binaries build