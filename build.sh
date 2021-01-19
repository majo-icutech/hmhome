#!/bin/sh

mkdir -p tmp/

cp -a addon tmp/
cp -a etc tmp/
cp -a rc.d tmp/
cp -a www tmp/
cp update_script tmp/
cd tmp
tar --owner=root --group=root -czvf ../hmhome_addon-$(cat addon/VERSION).tar.gz *
cd ..
rm -rf tmp