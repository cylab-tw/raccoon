{
    "targets": [
        {
            "conditions": [
                ['OS=="win"', {
                    "copies": [
                        {
                            "destination": './build/Release',
                            "files": [
                                "models/dcmtk/win-dll/dcmdata.dll",
                                "models/dcmtk/win-dll/ofstd.dll",
                                "models/dcmtk/win-dll/oflog.dll"
                            ]
                        }
                    ],
                    "include_dirs": [
                        "models/dcmtk/win-dll/config/include/",
                        "models/dcmtk/dcmdata/include",
                        "models/dcmtk/oflog/include",
                        "models/dcmtk/ofstd/include",
                    ],
                    "library_dirs": [
                        "<(module_root_dir)/models/dcmtk/win-dll/lib"
                    ],
                    "libraries": [
                        "-loflog",
                        "-lofstd",
                        "-ldcmdata" , 
                        "-Wl,-rpath,<(module_root_dir)/models/dcmtk/win-dll/lib"
                    ]
                }],
                ['OS=="linux"', {
                    "include_dirs": [
                        "models/dcmtk/linux-lib/usr/local/include/"
                    ],
                    "library_dirs": [
                        "<(module_root_dir)/models/dcmtk/linux-lib/usr/local/lib"
                    ] , 
                    "libraries" : [
                        "-ldcmtk",
                        "-Wl,-rpath,<(module_root_dir)/models/dcmtk/linux-lib/usr/local/lib"
                    ]
                }]
            ],
            "target_name": "dcm2json",
            "sources": ["./models/dcmtk/customV8/dcm2json.cc"],
        }
    ]
}
